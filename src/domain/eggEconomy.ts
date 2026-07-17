// 蛋经济规则(F4 定稿 + 2026-07 爸爸裁决,SPEC §3.1 / 架构方案 §2.2)
// 纯函数:输入 FarmState,输出新 FarmState 或 null(守卫拒绝)

import type { FarmState } from './types'
import { HATCH_MS, HATCHERY_SLOTS } from './types'

/** 完成当日必修的奖励:固定 1 颗(2026-07-17 爸爸定稿蛋经济 v2:
 *  必修 1 颗/天 + 写词游戏每轮 1 颗(日上限 GAME_EGGS_DAILY_CAP),多劳多得走游戏侧) */
export function eggsEarnedFor(_totalItems: number): 1 {
  return 1
}

/** 写词游戏奖励蛋的每日上限(蛋经济 v2):防无限刷蛋,加练本身不设限 */
export const GAME_EGGS_DAILY_CAP = 5

/** 分配一颗蛋去孵化:占用编号最小的空巢位 */
export function allocateEggToHatch(farm: FarmState, now: number): FarmState | null {
  if (farm.eggStock <= 0 || farm.incubating.length >= HATCHERY_SLOTS) return null
  const used = new Set(farm.incubating.map(e => e.slot))
  const slot = ([0, 1, 2] as const).find(s => !used.has(s))
  if (slot === undefined) return null
  return {
    ...farm,
    eggStock: farm.eggStock - 1,
    incubating: [...farm.incubating, { slot, placedAt: now }],
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

export function hatchesAt(placedAt: number): number {
  return placedAt + HATCH_MS
}

/** 煎蛋:放蛋进锅(库存 -1,empty → raw) */
export function putEggInPan(farm: FarmState): FarmState | null {
  if (farm.eggStock <= 0 || farm.cooking !== 'empty') return null
  return { ...farm, eggStock: farm.eggStock - 1, cooking: 'raw' }
}

/** 煎好(raw → ready;'cooking' 只是运行中的动画态,不落库,故也接受) */
export function fryingDone(farm: FarmState): FarmState | null {
  if (farm.cooking !== 'raw' && farm.cooking !== 'cooking') return null
  return { ...farm, cooking: 'ready' }
}

/** 喂食完成(ready → empty);喂食是纯情感互动,无数值 */
export function feedDone(farm: FarmState): FarmState | null {
  if (farm.cooking !== 'ready') return null
  return { ...farm, cooking: 'empty' }
}
