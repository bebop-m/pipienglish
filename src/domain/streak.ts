// 连胜规则(SPEC §3.3,F4-CHG-034):连续 7 天得 1 张守护卡,漏学时自动消耗接上连胜,
// 卡不够才归 1。规则只在此文件演进;补签卡草案(每月 3 张)已被守护卡取代。

import type { MetaState } from './types'
import { daysBetween } from './time'

export const SHIELD_STREAK_INTERVAL = 7
export const SHIELD_CARD_CAP = 3

/** 快进/重建存档时,按连胜天数应持有的守护卡数(每 7 天 1 张,最多 3 张) */
export function shieldCardsForStreak(streak: number): number {
  return Math.min(SHIELD_CARD_CAP, Math.max(0, Math.floor(streak / SHIELD_STREAK_INTERVAL)))
}

/**
 * 完成某日必修后的元信息更新;同日重复调用幂等。
 * - 昨天完成过:连胜 +1;
 * - 漏了 k 天且守护卡 ≥ k:扣 k 张,连胜照样 +1,记下用卡日期供完成卡文案;
 * - 卡不够:一张不扣,连胜归 1;
 * - 新连胜到 7 的倍数:+1 张,最多持有 3 张。
 */
export function completeDay(meta: MetaState, today: string): MetaState {
  if (meta.lastDoneDate === today) return meta
  const cards = meta.freezeCards ?? 0
  let streak = 1
  let remaining = cards
  let lastShieldUsedOn = meta.lastShieldUsedOn ?? null
  if (meta.lastDoneDate) {
    const missed = Math.max(0, daysBetween(meta.lastDoneDate, today) - 1)
    if (missed === 0) {
      streak = meta.streak + 1
    } else if (missed <= cards) {
      remaining = cards - missed
      streak = meta.streak + 1
      lastShieldUsedOn = today
    }
  }
  if (streak % SHIELD_STREAK_INTERVAL === 0) remaining = Math.min(SHIELD_CARD_CAP, remaining + 1)
  return {
    ...meta,
    streak,
    lastDoneDate: today,
    totalDays: meta.totalDays + 1,
    freezeCards: remaining,
    lastShieldUsedOn,
  }
}
