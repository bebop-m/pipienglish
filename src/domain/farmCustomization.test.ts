import { describe, expect, it } from 'vitest'
import { defaultCharacterLoadout } from '../application/farmPersistence'
import { INTERNAL_SCENE_1_COSMETIC_DRAFTS } from './farmCosmetics'
import {
  assetIsListable,
  clampPointToPlacementBounds,
  decorationCoversKeepout,
  decorationDisplayRect,
  equipLoadoutItem,
  initialDecorationHome,
  pointWithinPlacementBounds,
  resolveDecorationHome,
  unequipLoadoutItem,
} from './farmCustomization'
import { CUSTOMIZATION_ENTRANCE_KEEPOUT, DAILY_BOARD_KEEPOUT, type StageRect } from './farmLayout'
import { FARM_SCENE_DEFINITIONS } from './farmScenes'

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

describe('decoration keep-out and initial placement (2026-09-10 iPad feedback)', () => {
  const scene2 = FARM_SCENE_DEFINITIONS.find(scene => scene.id === 'scene-2')!
  const landmark = scene2.decorationCatalog.find(item => item.kind === 'landmark')!
  const medium = scene2.decorationCatalog.find(item => item.kind === 'medium')!
  const small = scene2.decorationCatalog.find(item => item.kind === 'small')!
  const overlaps = (a: StageRect, b: StageRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

  it('keeps a legal, uncovered point unchanged', () => {
    expect(resolveDecorationHome(landmark, { x: 700, y: 600 })).toEqual({ x: 700, y: 600 })
    expect(decorationCoversKeepout(landmark, { x: 700, y: 600 })).toBe(false)
  })

  it('pushes a landmark dropped behind the daily board back into a clickable spot', () => {
    // 真机复现:风车拖到左上角,落点被钳到 (240,390) 后整张藏在完成卡片背后
    const home = resolveDecorationHome(landmark, { x: 200, y: 250 })
    expect(decorationCoversKeepout(landmark, home)).toBe(false)
    expect(pointWithinPlacementBounds(home, landmark.placementBounds)).toBe(true)
    expect(overlaps(decorationDisplayRect(landmark, home), DAILY_BOARD_KEEPOUT)).toBe(false)
  })

  it('pushes a medium prop out from under the board and a small one away from the bottom-right buttons', () => {
    const bench = resolveDecorationHome(medium, { x: 120, y: 500 })
    expect(decorationCoversKeepout(medium, bench)).toBe(false)
    expect(pointWithinPlacementBounds(bench, medium.placementBounds)).toBe(true)

    const basket = resolveDecorationHome(small, { x: 1154, y: 810 })
    expect(decorationCoversKeepout(small, basket)).toBe(false)
    expect(pointWithinPlacementBounds(basket, small.placementBounds)).toBe(true)
    expect(overlaps(decorationDisplayRect(small, basket), CUSTOMIZATION_ENTRANCE_KEEPOUT)).toBe(false)
  })

  it('every keep-out escape stays inside placement bounds across the whole bounds grid', () => {
    for (const item of [landmark, medium, small]) {
      const { xMin, xMax, yMin, yMax } = item.placementBounds
      for (let x = xMin; x <= xMax; x += 40) {
        for (let y = yMin; y <= yMax; y += 40) {
          const home = resolveDecorationHome(item, { x, y })
          expect(pointWithinPlacementBounds(home, item.placementBounds)).toBe(true)
          expect(decorationCoversKeepout(item, home)).toBe(false)
        }
      }
    }
  })

  it('spreads newly placed props instead of stacking them on the bounds center', () => {
    const first = initialDecorationHome(small, [])
    const second = initialDecorationHome(small, [{ definition: small, home: first }])
    const third = initialDecorationHome(small, [{ definition: small, home: first }, { definition: small, home: second }])
    expect(second).not.toEqual(first)
    expect(third).not.toEqual(first)
    expect(third).not.toEqual(second)
    for (const home of [first, second, third]) {
      expect(pointWithinPlacementBounds(home, small.placementBounds)).toBe(true)
      expect(decorationCoversKeepout(small, home)).toBe(false)
    }
    const a = decorationDisplayRect(small, first)
    const b = decorationDisplayRect(small, second)
    expect(Math.abs(a.left - b.left)).toBeGreaterThanOrEqual(small.render.displayBoxPt.width * 0.5)
  })
})
