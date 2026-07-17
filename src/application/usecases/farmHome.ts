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
import { addDays, dayKeyOf } from '../../domain/time'
import { WORDS, WORD_MAP } from '../../domain/words'
import { assembleViewModel, type ChickChatVM, type FarmSnapshot } from '../viewmodel'

const CHAT_NEIGHBOR_CAP = 3
const CHAT_TTL_MS = 4_000

export function createFarmUsecases(d: PipiDB) {
  async function getFarm(): Promise<FarmState> {
    return getKV(d, 'farmState', DEFAULT_FARM)
  }

  async function getMeta(now: number): Promise<MetaState> {
    return getKV(d, 'meta', defaultMeta(dayKeyOf(now)))
  }

  /** 时钟守卫:孵化结算 + 今日会话保障。启动/回前台/60s 间隔调用,幂等 */
  async function clockGuard(now = Date.now()): Promise<{ hatched: number; sessionRebuilt: boolean }> {
    let hatched = 0
    await d.transaction('rw', d.chicks, d.kv, async () => {
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
        await d.chicks.bulkAdd(rows)
        await setKV(d, 'farmState', settled.farm)
        hatched = settled.hatched
      }
    })

    const today = dayKeyOf(now)
    let sessionRebuilt = false
    if (!(await d.sessions.get(today))) {
      await d.sessions.put(await buildTodaySession(today, now))
      sessionRebuilt = true
    }
    return { hatched, sessionRebuilt }
  }

  async function buildTodaySession(today: string, now: number): Promise<DailySession> {
    const due = await d.cards.where('due').belowOrEqual(now).sortBy('due')
    const known = new Set(await d.cards.toCollection().primaryKeys())
    // 近两日积压记录,供 SPEC §5.1 连续积压判定(缺记录按 0/false)
    const recentBacklogs = (await Promise.all([addDays(today, -1), addDays(today, -2)].map(k => d.sessions.get(k)))).map(
      s => ({ backlog: s?.dueBacklog ?? 0, paused: s?.newWordsPaused ?? false }),
    )
    const plan = buildPlan({
      dueByOverdue: due.map(c => c.wordId),
      unlearned: WORDS.filter(w => !known.has(w.id)).map(w => w.id),
      backlogToday: due.length,
      recentBacklogs,
    })
    return {
      date: today,
      reviewIds: plan.reviewIds,
      newIds: plan.newIds,
      dueBacklog: due.length,
      newWordsPaused: plan.newWordsPaused,
      doneCount: 0,
      answered: 0,
      correct: 0,
      completed: false,
    }
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
  async function feedDone(chickId?: string): Promise<boolean> {
    let applied = false
    await d.transaction('rw', d.chicks, d.kv, async () => {
      const targetExists = chickId ? Boolean(await d.chicks.get(chickId)) : (await d.chicks.count()) > 0
      if (!targetExists) return
      const next = egg.feedDone(await getFarm())
      if (next) {
        await setKV(d, 'farmState', next)
        applied = true
      }
    })
    return applied
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
  async function placeChick(chickId: string, home: StagePoint): Promise<boolean> {
    if (!Number.isFinite(home.x) || !Number.isFinite(home.y)) return false
    return (await d.chicks.update(chickId, { homeX: home.x, homeY: home.y })) === 1
  }

  /**
   * 小鸡群聊:陈旧度加权抽 1+N 个已学词,更新"见面时间"。
   * 邻居由视觉层按几何挑选;只有 primary 播 TTS(调用方负责,SPEC §2.6)
   */
  async function chickChat(chickId: string, neighborIds: string[], now = Date.now()): Promise<ChickChatVM | null> {
    return d.transaction('rw', d.cards, d.chicks, d.seen, async () => {
      if (!(await d.chicks.get(chickId))) return null

      const requestedNeighbors = [...new Set(neighborIds)]
        .filter(id => id !== chickId)
        .slice(0, CHAT_NEIGHBOR_CAP)
      const neighborRows = await d.chicks.bulkGet(requestedNeighbors)
      const validNeighborIds = requestedNeighbors.filter((_, index) => Boolean(neighborRows[index]))

      const [cards, seenRows] = await Promise.all([d.cards.toArray(), d.seen.toArray()])
      const seenMap = new Map(seenRows.map(r => [r.wordId, r.lastSeenAt]))
      const pool = cards
        .filter(card => WORD_MAP.has(card.wordId))
        .map(card => {
          const reviewedAt = card.card.last_review ? new Date(card.card.last_review).getTime() : 0
          return {
            wordId: card.wordId,
            lastSeenAt: seenMap.get(card.wordId) ?? (Number.isFinite(reviewedAt) ? reviewedAt : 0),
          }
        })
      if (pool.length === 0) return null

      const drawn = weightedSample(pool, 1 + validNeighborIds.length, now)
      await d.seen.bulkPut(drawn.map(wordId => ({ wordId, lastSeenAt: now })))

      const entry = (wordId: string, id: string) => {
        const word = WORD_MAP.get(wordId)!
        return { chickId: id, word: word.word, meaning: word.meaning }
      }
      return {
        primary: entry(drawn[0], chickId),
        others: drawn.slice(1).map((wordId, index) => entry(wordId, validNeighborIds[index])),
        expiresAt: now + CHAT_TTL_MS,
      }
    })
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
