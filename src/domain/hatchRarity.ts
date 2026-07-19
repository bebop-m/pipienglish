export {
  hatchesAt as hatchDueAt,
  isHatchDue as isHatchReady,
  remainingHatchMs as hatchRemainingMs,
} from './hatchTiming'

export type ChickRarity = 'normal' | 'color' | 'special'

export interface HatchStreaks {
  normalHatchStreak: number
  nonSpecialHatchStreak: number
}
export interface HatchOutcome {
  placedAt: number
  rarity: ChickRarity
  variantId: string
}

export interface HatchPlacementState extends HatchStreaks {
  eggStock: number
  incubating: HatchOutcome | null
}

export type HatchVariantPools = Record<ChickRarity, readonly string[]>

export interface HatchSources {
  now: () => number
  random: () => number
}

export interface HatchRoll extends HatchStreaks {
  rarity: ChickRarity
}

export type PlaceEggResult =
  | { ok: true; state: HatchPlacementState; outcome: HatchOutcome }
  | {
      ok: false
      state: HatchPlacementState
      reason: 'no-egg' | 'nest-occupied' | 'variant-pool-empty'
    }

export const NORMAL_HATCH_PROBABILITY = 0.83
export const COLOR_HATCH_PROBABILITY = 0.15
export const SPECIAL_HATCH_PROBABILITY = 0.02
export const NORMAL_PITY_THRESHOLD = 9
export const NON_SPECIAL_PITY_THRESHOLD = 35

function unitRandom(random: () => number): number {
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('random source must return a finite value in [0, 1)')
  }
  return value
}

function updateStreaks(rarity: ChickRarity, streaks: HatchStreaks): HatchStreaks {
  if (rarity === 'special') return { normalHatchStreak: 0, nonSpecialHatchStreak: 0 }
  if (rarity === 'color') {
    return {
      normalHatchStreak: 0,
      nonSpecialHatchStreak: streaks.nonSpecialHatchStreak + 1,
    }
  }
  return {
    normalHatchStreak: streaks.normalHatchStreak + 1,
    nonSpecialHatchStreak: streaks.nonSpecialHatchStreak + 1,
  }
}

/** 按“特殊保底 → 83/15/2 → 异色保底”的固定优先级抽取并更新计数。 */
export function rollHatchRarity(streaks: HatchStreaks, random: () => number): HatchRoll {
  let rarity: ChickRarity
  if (streaks.nonSpecialHatchStreak >= NON_SPECIAL_PITY_THRESHOLD) {
    rarity = 'special'
  } else {
    const roll = unitRandom(random)
    rarity = roll < NORMAL_HATCH_PROBABILITY
      ? 'normal'
      : roll < NORMAL_HATCH_PROBABILITY + COLOR_HATCH_PROBABILITY
        ? 'color'
        : 'special'
    if (rarity === 'normal' && streaks.normalHatchStreak >= NORMAL_PITY_THRESHOLD) {
      rarity = 'color'
    }
  }
  return { rarity, ...updateStreaks(rarity, streaks) }
}

function chooseVariant(
  rarity: ChickRarity,
  pools: HatchVariantPools,
  ownedVariantIds: ReadonlySet<string>,
  random: () => number,
): string | null {
  const pool = [...new Set(pools[rarity])]
  if (pool.length === 0) return null
  const unowned = pool.filter(id => !ownedVariantIds.has(id))
  const candidates = unowned.length > 0 ? unowned : pool
  if (candidates.length === 1) return candidates[0]
  return candidates[Math.floor(unitRandom(random) * candidates.length)]
}

/**
 * 放蛋纯规则：先守卫单巢与库存，再固定稀有度、款式和 placedAt。
 * 时间及所有随机数均由调用方注入；失败不会扣蛋或推进保底。
 */
export function placeEgg(
  state: HatchPlacementState,
  pools: HatchVariantPools,
  ownedVariantIds: ReadonlySet<string>,
  sources: HatchSources,
): PlaceEggResult {
  if (state.eggStock <= 0) return { ok: false, state, reason: 'no-egg' }
  if (state.incubating !== null) return { ok: false, state, reason: 'nest-occupied' }

  const roll = rollHatchRarity(state, sources.random)
  const variantId = chooseVariant(roll.rarity, pools, ownedVariantIds, sources.random)
  if (variantId === null) return { ok: false, state, reason: 'variant-pool-empty' }

  const outcome: HatchOutcome = {
    placedAt: sources.now(),
    rarity: roll.rarity,
    variantId,
  }
  return {
    ok: true,
    outcome,
    state: {
      eggStock: state.eggStock - 1,
      incubating: outcome,
      normalHatchStreak: roll.normalHatchStreak,
      nonSpecialHatchStreak: roll.nonSpecialHatchStreak,
    },
  }
}
