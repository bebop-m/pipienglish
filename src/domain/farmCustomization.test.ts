import { describe, expect, it } from 'vitest'
import { defaultCharacterLoadout } from '../application/farmPersistence'
import { INTERNAL_SCENE_1_COSMETIC_DRAFTS } from './farmCosmetics'
import {
  assetIsListable,
  clampPointToPlacementBounds,
  equipLoadoutItem,
  pointWithinPlacementBounds,
  unequipLoadoutItem,
} from './farmCustomization'

describe('farm customization domain rules', () => {
  it('filters internal placeholders from production and accepts finite boundary points', () => {
    expect(assetIsListable('approved')).toBe(true)
    expect(assetIsListable('internal-placeholder')).toBe(false)
    expect(assetIsListable('internal-placeholder', true)).toBe(true)
    const bounds = { xMin: 10, xMax: 20, yMin: 30, yMax: 40 }
    expect(pointWithinPlacementBounds({ x: 10, y: 40 }, bounds)).toBe(true)
    expect(pointWithinPlacementBounds({ x: 9, y: 40 }, bounds)).toBe(false)
    expect(pointWithinPlacementBounds({ x: Number.NaN, y: 35 }, bounds)).toBe(false)
  })

  it('clamps drag targets back inside placement bounds so persisted moves always pass the guard', () => {
    const bounds = { xMin: 40, xMax: 1154, yMin: 560, yMax: 810 }
    expect(clampPointToPlacementBounds({ x: 600, y: 700 }, bounds)).toEqual({ x: 600, y: 700 })
    expect(clampPointToPlacementBounds({ x: -30, y: 900 }, bounds)).toEqual({ x: 40, y: 810 })
    expect(clampPointToPlacementBounds({ x: 2000, y: 100 }, bounds)).toEqual({ x: 1154, y: 560 })
    const clamped = clampPointToPlacementBounds({ x: 1300, y: 500 }, bounds)
    expect(pointWithinPlacementBounds(clamped, bounds)).toBe(true)
  })

  it('validates target and slot while keeping ownership outside the loadout', () => {
    const initial = defaultCharacterLoadout()
    const outfit = INTERNAL_SCENE_1_COSMETIC_DRAFTS.find(item => item.slot === 'outfit')!
    expect(equipLoadoutItem(initial, outfit, 'mother', 'headwear')).toEqual({
      ok: false,
      reason: 'target-mismatch',
    })
    expect(equipLoadoutItem(initial, outfit, 'xiaopi', 'accessory')).toEqual({
      ok: false,
      reason: 'slot-mismatch',
    })

    const equipped = equipLoadoutItem(initial, outfit, 'xiaopi', 'outfit')
    expect(equipped.ok).toBe(true)
    if (!equipped.ok) return
    expect(equipped.loadout.xiaopi.outfit).toBe(outfit.id)
    expect(initial.xiaopi.outfit).not.toBe(outfit.id)

    const unequipped = unequipLoadoutItem(equipped.loadout, 'xiaopi', 'outfit')
    expect(unequipped.ok && unequipped.loadout.xiaopi.outfit).toBe(initial.xiaopi.outfit)
    expect(unequipLoadoutItem(initial, 'mother', 'outfit')).toEqual({
      ok: false,
      reason: 'slot-mismatch',
    })
  })
})
