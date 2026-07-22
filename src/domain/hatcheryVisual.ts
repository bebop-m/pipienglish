import type { ChickRarity } from './hatchRarity'
import type { HatcheryVisualState } from './farmScenes'
import { HATCH_MS } from './types'

export const WHOLE_EGG_MIN_REMAINING_RATIO = 0.5
export const HAIRLINE_CRACK_MIN_REMAINING_RATIO = 0.2
export const TWO_SHELLS_DISPLAY_MS = 800
export const HATCH_OUTCOME_DISPLAY_MS = 1_500

/** 只依赖公开剩余时间；不得读取尚未破壳的 rarity 或 variantId。 */
export function incubationHatcheryVisualState(
  incubating: { remainingMs: number } | null,
): Extract<HatcheryVisualState, 'empty' | 'whole' | 'hairlineCrack' | 'largeCrack'> {
  if (!incubating) return 'empty'
  const remainingRatio = incubating.remainingMs / HATCH_MS
  if (remainingRatio > WHOLE_EGG_MIN_REMAINING_RATIO) return 'whole'
  if (remainingRatio > HAIRLINE_CRACK_MIN_REMAINING_RATIO) return 'hairlineCrack'
  return 'largeCrack'
}

export function hatchOutcomeVisualState(
  rarity: ChickRarity,
): Extract<HatcheryVisualState, 'normalHatch' | 'colorHatch' | 'specialHatch'> {
  if (rarity === 'special') return 'specialHatch'
  if (rarity === 'color') return 'colorHatch'
  return 'normalHatch'
}
