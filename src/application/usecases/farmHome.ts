// F4 首页用例:状态读写与守卫,全部接受注入的 now 以便测试
// 视觉层不得直接 import 本文件之下的 db —— 一律经 useFarmHome 桥

import type { PipiDB } from '../db'
import { DEFAULT_FARM, DEFAULT_SETTINGS, defaultMeta, getKV, setKV } from '../db'
import type { Chick, FarmState, MetaState, Settings, StagePoint, DailySession } from '../../domain/types'
import { VISIBLE_CHICK_CAP } from '../../domain/types'
import * as egg from '../../domain/eggEconomy'
import { completeDay } from '../../domain/streak'
import { buildPlan, totalItems } from '../../domain/dailyPlan'
import { weightedSample } from '../../domain/staleness'
import { dayKeyOf } from '../../domain/time'
import { WORDS, WORD_MAP } from '../../domain/words'
import { assembleViewModel, type ChickChatVM, type FarmSnapshot } from '../viewmodel'

export function createFarmUsecases(d: PipiDB) {
  async function getFarm(): Promise<FarmState> {
    return getKV(d, 'farmState', DEFAULT_FARM)
  }

  async function getMeta(now: number): Promise<MetaState> {
    return getKV(d, 'meta', defaultMeta(dayKeyOf(now)))
  }

  /** 时钟守卫:孵化结算 + 今日会话保障。启动/回前台/60s 间隔调用,幂等 */
  async function clockGuard(now = Date.now()): Promise<{ hatched: number; sessionRebuilt: boolean }> {
    const farm = await getFarm()
    const settled = egg.settleHatches(farm, now)
    if (settled.hatched > 0) {
      const bornOn = dayKeyOf(now)
      const rows: Chick[] = Array.from({ length: settled.hatched }, () => ({
        chickId: crypto.randomUUID(),
        bornOn,
        source: 'hatch',
        homeX: null,
        homeY: null,
      }))
      await d.transaction('rw', d.chicks, d.kv, async () => {
        await d.chicks.bulkAdd(rows)
        await setKV(d, 'farmState', settled.farm)
      })
    }

    const today = dayKeyOf(now)
    let sessionRebuilt = false
    if (!(await d.sessions.get(today))) {
      await d.sessions.put(await buildTodaySession(today, now))
      sessionRebuilt = true
    }
    return { hatched: settled.hatched, sessionRebuilt }
  }

  async function buildTodaySession(today: string, now: number): Promise<DailySession> {
    const due = await d.cards.where('due').belowOrEqual(now).sortBy('due')
    const known = new Set(await d.cards.toCollection().primaryKeys())
    const plan = buildPlan({
      dueByOverdue: due.map(c => c.wordId),
      unlearned: WORDS.filter(w => !known.has(w.id)).map(w => w.id),
    })
    return { date: today, ...plan, doneCount: 0, answered: 0, correct: 0, completed: false }
  }

  /** 完成当日必修:发蛋 + 连胜;同日幂等(以 session.completed 为准) */
  async function completeDailyLesson(now = Date.now()): Promise<void> {
    const today = dayKeyOf(now)
    await d.transaction('rw', d.sessions, d.kv, async () => {
      const session = await d.sessions.get(today)
      if (!session || session.completed) return
      session.completed = true
      await d.sessions.put(session)

      const farm = await getFarm()
      await setKV(d, 'farmState', { ...farm, eggStock: farm.eggStock + egg.eggsEarnedFor(totalItems(session)) })
      await setKV(d, 'meta', completeDay(await getMeta(now), today))
    })
  }

  async function nameHen(name: string): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed) return
    const farm = await getFarm()
    await setKV(d, 'farmState', { ...farm, henName: trimmed })
  }

  /** 蛋分配三连:守卫拒绝时静默返回 false(视觉层据 VM 已禁用对应按钮) */
  async function allocateEggToHatch(now = Date.now()): Promise<boolean> {
    return applyFarmRule(farm => egg.allocateEggToHatch(farm, now))
  }
  async function putEggInPan(): Promise<boolean> {
    return applyFarmRule(egg.putEggInPan)
  }
  async function fryingDone(): Promise<boolean> {
    return applyFarmRule(egg.fryingDone)
  }
  async function feedDone(): Promise<boolean> {
    return applyFarmRule(egg.feedDone)
  }

  async function applyFarmRule(rule: (farm: FarmState) => FarmState | null): Promise<boolean> {
    let applied = false
    await d.transaction('rw', d.kv, async () => {
      const next = rule(await getFarm())
      if (next) {
        await setKV(d, 'farmState', next)
        applied = true
      }
    })
    return applied
  }

  /** 拖放落点持久化(1194×834 逻辑坐标) */
  async function placeChick(chickId: string, home: StagePoint): Promise<void> {
    await d.chicks.update(chickId, { homeX: home.x, homeY: home.y })
  }

  /**
   * 小鸡群聊:陈旧度加权抽 1+N 个已学词,更新"见面时间"。
   * 邻居由视觉层按几何挑选;只有 primary 播 TTS(调用方负责,SPEC §2.6)
   */
  async function chickChat(chickId: string, neighborIds: string[], now = Date.now()): Promise<ChickChatVM | null> {
    const [cards, seenRows] = await Promise.all([d.cards.toArray(), d.seen.toArray()])
    if (cards.length === 0) return null
    const seenMap = new Map(seenRows.map(r => [r.wordId, r.lastSeenAt]))
    const pool = cards.map(c => ({
      wordId: c.wordId,
      lastSeenAt: seenMap.get(c.wordId) ?? (c.card.last_review ? new Date(c.card.last_review).getTime() : 0),
    }))
    const drawn = weightedSample(pool, 1 + neighborIds.length, now)
    await d.seen.bulkPut(drawn.map(wordId => ({ wordId, lastSeenAt: now })))

    const entry = (wordId: string, id: string) => {
      const w = WORD_MAP.get(wordId)
      return { chickId: id, word: w?.word ?? wordId, meaning: w?.meaning ?? '' }
    }
    return {
      primary: entry(drawn[0], chickId),
      others: drawn.slice(1).map((wordId, i) => entry(wordId, neighborIds[i])),
      expiresAt: now + 4000,
    }
  }

  async function setMotion(enabled: boolean): Promise<void> {
    const settings = await getKV<Settings>(d, 'settings', DEFAULT_SETTINGS)
    await setKV(d, 'settings', { ...settings, motionEnabled: enabled })
  }

  async function snapshot(now = Date.now()): Promise<FarmSnapshot> {
    const today = dayKeyOf(now)
    const [farm, meta, settings, session, chicksTotal, latestChicks, rescueCount] = await Promise.all([
      getFarm(),
      getMeta(now),
      getKV<Settings>(d, 'settings', DEFAULT_SETTINGS),
      d.sessions.get(today),
      d.chicks.count(),
      d.chicks.orderBy('bornOn').reverse().limit(VISIBLE_CHICK_CAP).toArray(),
      d.rescue.count(),
    ])
    return {
      farm,
      meta,
      motionEnabled: settings.motionEnabled,
      session: session ?? { date: today, reviewIds: [], newIds: [], doneCount: 0, answered: 0, correct: 0, completed: false },
      chicksTotal,
      latestChicks,
      rescueCount,
      now,
    }
  }

  async function loadViewModel(now = Date.now()) {
    return assembleViewModel(await snapshot(now))
  }

  return {
    clockGuard,
    completeDailyLesson,
    nameHen,
    allocateEggToHatch,
    putEggInPan,
    fryingDone,
    feedDone,
    placeChick,
    chickChat,
    setMotion,
    snapshot,
    loadViewModel,
  }
}

export type FarmUsecases = ReturnType<typeof createFarmUsecases>
