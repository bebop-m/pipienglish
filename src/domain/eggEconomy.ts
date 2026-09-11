// 蛋经济规则(长期农场最终裁决,SPEC §3.1 / 架构方案 §2.2)
// 纯函数:输入 FarmState,输出新 FarmState 或 null(守卫拒绝)

import type { DailySession, FarmState } from './types'
import { HATCH_MS, HATCHERY_SLOTS } from './types'

export { hatchesAt, isHatchDue, remainingHatchMs } from './hatchTiming'

/** 完成当日必修固定获得 1 颗(F4-CHG-034:2 → 1,想多拿蛋就多玩写词游戏);题量不改变奖励。 */
export function eggsEarnedFor(_totalItems: number): 1 {
  return DAILY_LESSON_EGGS
}

export const DAILY_LESSON_EGGS = 1 as const

/** 写词游戏前 10 轮有奖励；第 11 轮起仍可无限加练。 */
export const GAME_ROUNDS_DAILY_CAP = 10
/** 当天第一轮 2 颗(爸爸 2026-09-11:必修只给 1 颗后,第一轮游戏多给一颗把她引进去),之后每轮 1 颗 */
export const FIRST_GAME_ROUND_EGGS = 2 as const
export const GAME_ROUND_EGGS = 1 as const
/** 旧名保留(语义 = 每日有奖励的轮数上限) */
export const GAME_EGGS_DAILY_CAP = GAME_ROUNDS_DAILY_CAP

/** 今日已结算的游戏轮数;更新前的旧会话没有 gameRounds,按「每轮 1 颗」从蛋数推算 */
export function gameRoundsPlayed(session: Pick<DailySession, 'gameRounds' | 'gameEggs'>): number {
  return session.gameRounds ?? session.gameEggs ?? 0
}

/** 下一轮写词游戏能拿几颗蛋:未完成必修/不是今天/轮数拿满 → 0;第一轮 2;其后 1 */
export function nextGameRoundEggs(
  session: Pick<DailySession, 'date' | 'completed' | 'gameRounds' | 'gameEggs'>,
  localDayKey: string,
): 0 | 1 | 2 {
  if (!session.completed || session.date !== localDayKey) return 0
  const rounds = gameRoundsPlayed(session)
  if (rounds >= GAME_ROUNDS_DAILY_CAP) return 0
  return rounds === 0 ? FIRST_GAME_ROUND_EGGS : GAME_ROUND_EGGS
}

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
 * 前 10 轮有奖励(第一轮 2 颗、其后 1 颗),之后返回 0,但游戏本身不被禁止。
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
  const award = nextGameRoundEggs(session, localDayKey)
  if (award === 0) return { session, farm, awarded: 0 }
  return {
    session: {
      ...session,
      gameRounds: gameRoundsPlayed(session) + 1,
      gameEggs: (session.gameEggs ?? 0) + award,
    },
    farm: { ...farm, eggStock: farm.eggStock + award },
    awarded: award,
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
