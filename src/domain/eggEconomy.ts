// 蛋经济规则(长期农场最终裁决,SPEC §3.1 / 架构方案 §2.2)
// 纯函数:输入 FarmState,输出新 FarmState 或 null(守卫拒绝)

import type { DailySession, FarmState } from './types'
import { HATCH_MS, HATCHERY_SLOTS } from './types'

export { hatchesAt, isHatchDue, remainingHatchMs } from './hatchTiming'

/** 完成当日必修固定获得 2 颗；题量不改变奖励。 */
export function eggsEarnedFor(_totalItems: number): 2 {
  return 2
}

export const DAILY_LESSON_EGGS = 2 as const

/** 写词游戏前 10 轮有奖励；第 11 轮起仍可无限加练。 */
export const GAME_EGGS_DAILY_CAP = 10

export interface EggBalance {
  eggStock: number
}

export interface EggRewardResult<TFarm extends EggBalance = FarmState> {
  session: DailySession
  farm: TFarm
  awarded: 0 | 1 | 2
}

/**
 * 在同一事务里完成必修并发蛋。session.completed 是幂等键：已完成的
 * DailySession 再次提交不会重复发奖。
 */
export function completeDailyLessonWithEggs<TFarm extends EggBalance>(
  session: DailySession,
  farm: TFarm,
): EggRewardResult<TFarm> {
  if (session.completed) return { session, farm, awarded: 0 }
  return {
    session: { ...session, completed: true },
    farm: { ...farm, eggStock: farm.eggStock + DAILY_LESSON_EGGS },
    awarded: DAILY_LESSON_EGGS,
  }
}

/**
 * 结算一轮写词游戏。奖励只属于传入的本地 dayKey 对应的已完成必修会话；
 * gameEggs 达到 10 后返回 0，但游戏本身不被禁止。
 */
export function awardHandwritingRoundEgg(
  session: DailySession,
  farm: FarmState,
  localDayKey: string,
): EggRewardResult
export function awardHandwritingRoundEgg<TFarm extends EggBalance>(
  session: DailySession,
  farm: TFarm,
  localDayKey: string,
): EggRewardResult<TFarm>
export function awardHandwritingRoundEgg<TFarm extends EggBalance>(
  session: DailySession,
  farm: TFarm,
  localDayKey: string,
): EggRewardResult<TFarm> {
  const gameEggs = session.gameEggs ?? 0
  if (!session.completed || session.date !== localDayKey || gameEggs >= GAME_EGGS_DAILY_CAP) {
    return { session, farm, awarded: 0 }
  }
  return {
    session: { ...session, gameEggs: gameEggs + 1 },
    farm: { ...farm, eggStock: farm.eggStock + 1 },
    awarded: 1,
  }
}

export function canAllocateEggToHatch(farm: FarmState): boolean {
  return farm.eggStock > 0 && farm.incubating.length < HATCHERY_SLOTS
}

/** 分配一颗蛋去唯一巢位。稀有结果由 hatchRarity.placeEgg 确定。 */
export function allocateEggToHatch(farm: FarmState, now: number): FarmState | null {
  if (!canAllocateEggToHatch(farm)) return null
  return {
    ...farm,
    eggStock: farm.eggStock - 1,
    incubating: [{ slot: 0, placedAt: now }],
  }
}

/** 结算到期孵化(now ≥ placedAt + 24h);返回新状态与破壳数 */
export function settleHatches(farm: FarmState, now: number): { farm: FarmState; hatched: number } {
  const due = farm.incubating.filter(e => now >= e.placedAt + HATCH_MS)
  if (due.length === 0) return { farm, hatched: 0 }
  return {
    farm: { ...farm, incubating: farm.incubating.filter(e => now < e.placedAt + HATCH_MS) },
    hatched: due.length,
  }
}
