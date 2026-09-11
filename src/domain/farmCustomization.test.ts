import { describe, expect, it } from 'vitest'
import { defaultCharacterLoadout } from '../application/farmPersistence'
import { INTERNAL_SCENE_1_COSMETIC_DRAFTS } from './farmCosmetics'
import {
  assetIsListable,
  clampPointToPlacementBounds,
  decorationBlockedByKeepouts,
  decorationDisplayRect,
  equipLoadoutItem,
  initialDecorationHome,
  pointWithinPlacementBounds,
  resolveDecorationHome,
  unequipLoadoutItem,
} from './farmCustomization'
import { uiKeepoutsFor } from './farmLayout'
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

describe('decoration keep-out and initial placement (2026-09-10 iPad feedback, softened 2026-09-11)', () => {
  const scene2 = FARM_SCENE_DEFINITIONS.find(scene => scene.id === 'scene-2')!
  const landmark = scene2.decorationCatalog.find(item => item.kind === 'landmark')!
  const medium = scene2.decorationCatalog.find(item => item.kind === 'medium')!
  const small = scene2.decorationCatalog.find(item => item.kind === 'small')!
  const taskKeepouts = uiKeepoutsFor('task')

  it('keeps a legal, uncovered point unchanged', () => {
    expect(resolveDecorationHome(landmark, { x: 700, y: 600 })).toEqual({ x: 700, y: 600 })
    expect(decorationBlockedByKeepouts(landmark, { x: 700, y: 600 })).toBe(false)
  })

  it('moves a landmark dropped fully behind the daily board to a spot that is still grabbable', () => {
    // 真机复现:风车拖到左上角,整张藏在完成卡片背后
    const home = resolveDecorationHome(landmark, { x: 200, y: 250 })
    expect(decorationBlockedByKeepouts(landmark, home)).toBe(false)
    expect(pointWithinPlacementBounds(home, landmark.placementBounds)).toBe(true)
    expect(home).not.toEqual({ x: 200, y: 250 })
  })

  it('lets stickers sit right below or beside the task board when only the task board is showing (no air wall)', () => {
    // 小皮 2026-09-11:任务卡周围有空气墙。任务卡底边 343,小装饰锚点在 400 时框顶 339,只碰 4pt → 原地不动
    expect(resolveDecorationHome(small, { x: 300, y: 400 }, taskKeepouts)).toEqual({ x: 300, y: 400 })
    // 地标压住任务卡一半以上仍露出 44% → 允许
    expect(resolveDecorationHome(landmark, { x: 200, y: 450 }, taskKeepouts)).toEqual({ x: 200, y: 450 })
    // 靠在卡片右侧
    expect(resolveDecorationHome(medium, { x: 480, y: 250 }, taskKeepouts)).toEqual({ x: 480, y: 250 })
  })

  it('keeps every escape inside placement bounds and grabbable across the whole bounds grid', () => {
    for (const keepouts of [undefined, taskKeepouts, uiKeepoutsFor('complete'), uiKeepoutsFor('name')]) {
      for (const item of [landmark, medium, small]) {
        const { xMin, xMax, yMin, yMax } = item.placementBounds
        for (let x = xMin; x <= xMax; x += 40) {
          for (let y = yMin; y <= yMax; y += 40) {
            const home = resolveDecorationHome(item, { x, y }, keepouts)
            expect(pointWithinPlacementBounds(home, item.placementBounds)).toBe(true)
            expect(decorationBlockedByKeepouts(item, home, keepouts)).toBe(false)
          }
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
      expect(decorationBlockedByKeepouts(small, home)).toBe(false)
    }
    const a = decorationDisplayRect(small, first)
    const b = decorationDisplayRect(small, second)
    expect(Math.abs(a.left - b.left)).toBeGreaterThanOrEqual(small.render.displayBoxPt.width * 0.5)
  })
})
