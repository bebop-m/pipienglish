// 家长页「快进到 Day N」:换机应急(2026-08-05 爸爸裁决,iPad Pro 送修改用 mini)。
// 在本机造出 N 天按计划全对完成的历史,让新设备直接接上进度、习惯不断档。
//
// 能精确还原:已学词集合(词库固定投放顺序)、连胜与会话日期、totalDays。
// 只能近似:FSRS 排程按「全对」模拟,真实答错过的词本会更频繁出现。
// 推导不出、由家长输入:蛋库存(游戏蛋不可推)、小鸡数量(孵化节奏取决于孩子)。
// 不恢复:描红笔迹、救援队列、贴纸/装扮 —— 与备份导入同级,整档覆盖,无合并。

import type { PipiDB, CardRow, SeenRow } from './db'
import { defaultMeta, DEFAULT_SETTINGS } from './db'
import type { DailySession, MetaState, Settings } from '../domain/types'
import { buildPlan, totalItems, type RecentBacklog } from '../domain/dailyPlan'
import { newCard, rate } from '../domain/srs'
import { addDays, dayKey } from '../domain/time'
import { WORDS } from '../domain/words'
import { STARTER_WORD_IDS } from './starterWords'
import {
  defaultCharacterLoadout,
  defaultFarmStateV3,
  persistedChickWithDefaults,
  type PersistedChick,
} from './farmPersistence'

export interface FastForwardInput {
  /** 已完成的天数 N(≥1);模拟为「昨天结束的连续 N 天」,今天打开即学 Day N+1 */
  days: number
  /** 当前连胜;超过 N 时按 N 截断 */
  streak: number
  /** 小鸡数量(孵化历史不可推导,家长照旧设备实况填) */
  chicks: number
  /** 蛋库存(同上) */
  eggs: number
  /** 母鸡名字(小皮在旧设备起的名);空视为未起名 */
  henName: string
}

export interface FastForwardResult {
  daysSimulated: number
  wordsLearned: number // 含起步词
  firstDay: string
  lastDay: string
}

/** 每天按晚上 7 点结算:早于当天末尾,晚于前日新卡的 10 分钟学习步 */
function simTimeOf(date: string): number {
  return new Date(`${date}T19:00:00`).getTime()
}

export function validateFastForwardInput(input: FastForwardInput): string | null {
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 3650) return '天数需为 1–3650 的整数'
  if (!Number.isInteger(input.streak) || input.streak < 0) return '连胜需为不小于 0 的整数'
  if (!Number.isInteger(input.chicks) || input.chicks < 0 || input.chicks > 500) return '小鸡数需为 0–500 的整数'
  if (!Number.isInteger(input.eggs) || input.eggs < 0 || input.eggs > 9999) return '蛋数需为 0–9999 的整数'
  return null
}

/**
 * 整档重建。clock 可注入(与 backup.importAll 同理:真实时钟会让测试跨日失败)。
 * settings 保留本机现值(音乐/动效偏好不属于学习档案)。
 */
export async function fastForward(
  d: PipiDB,
  input: FastForwardInput,
  clock: { today?: string } = {},
): Promise<FastForwardResult> {
  const invalid = validateFastForwardInput(input)
  if (invalid) throw new Error(invalid)

  const today = clock.today ?? dayKey()
  const dateOf = (dayIndex: number) => addDays(today, dayIndex - input.days - 1) // dayIndex ∈ [1..N] → 昨天为第 N 天
  const installDate = dateOf(1)
  const installTime = simTimeOf(installDate)

  // —— 内存中重放 N 天 ——
  const cards = new Map<string, CardRow>()
  const seen = new Map<string, number>()
  const sessions: DailySession[] = []

  // 起步词播种发生在 Day 1 建会话之前(与 clockGuard 顺序一致):两次 Good,排程推后几天
  for (const wordId of STARTER_WORD_IDS) {
    const card = rate(rate(newCard(installTime), true, installTime), true, installTime)
    cards.set(wordId, { wordId, due: card.due.getTime(), card })
    seen.set(wordId, installTime)
  }

  for (let dayIndex = 1; dayIndex <= input.days; dayIndex++) {
    const date = dateOf(dayIndex)
    const now = simTimeOf(date)
    const due = [...cards.values()].filter(row => row.due <= now).sort((a, b) => a.due - b.due)
    const unlearned = WORDS.filter(word => !cards.has(word.id)).map(word => word.id)
    const recentBacklogs: RecentBacklog[] = [sessions[sessions.length - 1], sessions[sessions.length - 2]].map(s => ({
      backlog: s?.dueBacklog ?? 0,
      paused: s?.newWordsPaused ?? false,
    }))
    const plan = buildPlan({
      dueByOverdue: due.map(row => row.wordId),
      unlearned,
      backlogToday: due.length,
      recentBacklogs,
    })

    // 与真实学习流一致:每词每日一评,全对 → Good;新词首评即建卡
    for (const wordId of plan.reviewIds) {
      const existing = cards.get(wordId)!
      const card = rate(existing.card, true, now)
      cards.set(wordId, { wordId, due: card.due.getTime(), card })
      seen.set(wordId, now)
    }
    for (const wordId of plan.newIds) {
      const card = rate(newCard(now), true, now)
      cards.set(wordId, { wordId, due: card.due.getTime(), card })
      seen.set(wordId, now)
    }

    const answered = plan.reviewIds.length + plan.newIds.length
    sessions.push({
      date,
      reviewIds: plan.reviewIds,
      newIds: plan.newIds,
      dueBacklog: due.length,
      newWordsPaused: plan.newWordsPaused,
      doneCount: totalItems(plan),
      answered,
      correct: answered,
      completed: true,
      gameEggs: 0,
    })
  }

  // 小鸡:出生日铺在最近几天(每天最多孵 1 只的节奏),溢出的共享最早一天
  const farm = { ...defaultFarmStateV3(), henName: input.henName.trim() || null, eggStock: input.eggs }
  const chickRows: PersistedChick[] = []
  const uniquePrefix = Date.now()
  for (let i = 1; i <= input.chicks; i++) {
    const daysAgo = Math.min(input.chicks - i + 1, input.days)
    const bornOn = addDays(today, -daysAgo)
    chickRows.push(persistedChickWithDefaults(
      { chickId: `ff-${uniquePrefix}-${i}`, bornOn, source: 'hatch', homeX: null, homeY: null },
      farm.activeSceneId,
      simTimeOf(bornOn) + i, // +i 保证同日多只时次序稳定
    ))
  }

  const meta: MetaState = {
    ...defaultMeta(today),
    streak: Math.min(input.streak, input.days),
    lastDoneDate: dateOf(input.days),
    totalDays: input.days,
    installDate,
  }

  // —— 整档落库(与 importAll 同一清库-重建路径) ——
  await d.transaction('rw', [
    d.cards, d.sessions, d.kv, d.chicks, d.seen, d.rescue, d.ink, d.decorations, d.cosmetics, d.sceneMemory,
  ], async () => {
    const settings = (await d.kv.get('settings'))?.value as Settings | undefined
    await Promise.all([
      d.cards.clear(), d.sessions.clear(), d.kv.clear(), d.chicks.clear(), d.seen.clear(),
      d.rescue.clear(), d.ink.clear(), d.decorations.clear(), d.cosmetics.clear(), d.sceneMemory.clear(),
    ])
    await Promise.all([
      d.cards.bulkPut([...cards.values()]),
      d.sessions.bulkPut(sessions),
      d.seen.bulkPut([...seen].map(([wordId, lastSeenAt]): SeenRow => ({ wordId, lastSeenAt }))),
      chickRows.length ? d.chicks.bulkPut(chickRows) : Promise.resolve(),
      d.kv.bulkPut([
        { key: 'farmState', value: farm },
        { key: 'loadout', value: defaultCharacterLoadout() },
        { key: 'settings', value: settings ?? { ...DEFAULT_SETTINGS } },
        { key: 'meta', value: meta },
        { key: 'starterWordsSeeded', value: installTime },
      ]),
    ])
  })

  return {
    daysSimulated: input.days,
    wordsLearned: cards.size,
    firstDay: installDate,
    lastDay: dateOf(input.days),
  }
}
