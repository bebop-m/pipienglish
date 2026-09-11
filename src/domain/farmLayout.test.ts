import { describe, expect, it } from 'vitest'
import {
  blockedByKeepouts,
  boardKindFor,
  boxAvoidsKeepouts,
  clampBoxToStage,
  clampSceneElementHome,
  CUSTOMIZATION_ENTRANCE_KEEPOUT,
  fixedVisualLayout,
  HOME_BOARD_RECTS,
  MOVABLE_FARM_ELEMENT_IDS,
  normalizeSceneElementHomes,
  rectOf,
  resolveElementHome,
  resolveSceneElementHome,
  SCENE_ELEMENT_KEEPOUTS,
  SCENE_ELEMENT_LAYOUTS,
  STAGE_DRAG_INSETS,
  uiKeepoutsFor,
} from './farmLayout'

describe('farm scene element layout persistence', () => {
  it('keeps valid legacy coordinates and ignores malformed entries', () => {
    expect(normalizeSceneElementHomes({
      mother: { x: 510, y: 505 },
      xiaopi: { x: Number.NaN, y: 480 },
      hatchery: { x: '36', y: 520 },
      rescue: null,
      unknown: { x: 1, y: 2 },
    })).toEqual({ mother: { x: 510, y: 505 } })
  })

  it('clamps corrupted backup coordinates into the stage (whole home page is draggable, top bar excluded)', () => {
    expect(normalizeSceneElementHomes({
      mother: { x: -50_000, y: 50_000 },
      xiaopi: { x: 50_000, y: -50_000 },
      hatchery: { x: 50_000, y: -50_000 },
      rescue: { x: -50_000, y: 50_000 },
    })).toEqual({
      mother: { x: STAGE_DRAG_INSETS.left, y: 834 - 220 - STAGE_DRAG_INSETS.bottom },
      xiaopi: { x: 1194 - 252 - STAGE_DRAG_INSETS.right, y: STAGE_DRAG_INSETS.top },
      hatchery: { x: 1194 - 304 - STAGE_DRAG_INSETS.right, y: STAGE_DRAG_INSETS.top },
      rescue: { x: STAGE_DRAG_INSETS.left, y: 834 - 154 - STAGE_DRAG_INSETS.bottom },
    })
  })

  it('preserves every approved default home and rejects non-finite writes', () => {
    for (const [elementId, layout] of Object.entries(SCENE_ELEMENT_LAYOUTS)) {
      expect(clampSceneElementHome(
        elementId as keyof typeof SCENE_ELEMENT_LAYOUTS,
        layout.defaultHome,
      )).toEqual(layout.defaultHome)
    }
    expect(clampSceneElementHome('hatchery', { x: Number.POSITIVE_INFINITY, y: 1 })).toBeNull()
  })

  it('accepts scene fixed visuals through an explicit layout table', () => {
    const sign = fixedVisualLayout({ x: 1006, y: 468, width: 170, height: 170 })
    expect(normalizeSceneElementHomes(
      { 'scene-2-travel-sign': { x: 900, y: 300 }, 'scene-2-apple-juice-station': { x: 100, y: 100 } },
      { 'scene-2-travel-sign': sign },
    )).toEqual({ 'scene-2-travel-sign': { x: 900, y: 300 } })
    expect(resolveElementHome(sign, { x: 5000, y: -5000 })).toEqual({ x: 1194 - 170 - 8, y: 80 })
  })

  it('chicks may be dropped anywhere on the stage below the top bar', () => {
    const size = { width: 116, height: 116 }
    expect(clampBoxToStage(size, { x: -10, y: 0 })).toEqual({ x: 8, y: 80 })
    expect(clampBoxToStage(size, { x: 2000, y: 2000 })).toEqual({ x: 1194 - 116 - 8, y: 834 - 116 - 4 })
    expect(clampBoxToStage(size, { x: 600, y: 150 })).toEqual({ x: 600, y: 150 })
    expect(boxAvoidsKeepouts(size, { x: 100, y: 200 })).toBe(false)
    expect(boxAvoidsKeepouts(size, { x: 600, y: 150 })).toBe(true)
  })
})

describe('UI keep-outs (soft rule: enough of the element must stay grabbable)', () => {
  const blocked = (elementId: keyof typeof SCENE_ELEMENT_LAYOUTS, home: { x: number; y: number }, keepouts = SCENE_ELEMENT_KEEPOUTS) =>
    blockedByKeepouts(rectOf(SCENE_ELEMENT_LAYOUTS[elementId].size, home), keepouts)

  it('picks the board rect that is actually on screen', () => {
    expect(boardKindFor({ henName: null, completed: false, viewingCurrentJourney: true })).toBe('name')
    expect(boardKindFor({ henName: '咕咕', completed: false, viewingCurrentJourney: true })).toBe('task')
    expect(boardKindFor({ henName: '咕咕', completed: true, viewingCurrentJourney: true })).toBe('complete')
    expect(boardKindFor({ henName: '咕咕', completed: true, viewingCurrentJourney: false })).toBe('return')
    expect(uiKeepoutsFor('task')).toEqual([HOME_BOARD_RECTS.task, CUSTOMIZATION_ENTRANCE_KEEPOUT])
  })

  it('keeps every default home grabbable', () => {
    for (const elementId of MOVABLE_FARM_ELEMENT_IDS) {
      const { defaultHome } = SCENE_ELEMENT_LAYOUTS[elementId]
      expect([elementId, blocked(elementId, defaultHome)]).toEqual([elementId, false])
      expect(resolveSceneElementHome(elementId, defaultHome)).toEqual(defaultHome)
    }
  })

  it('lets the rescue basket sit right under the task board (no air wall below the card)', () => {
    const task = uiKeepoutsFor('task')
    expect(resolveSceneElementHome('rescue', { x: 60, y: 360 }, task)).toEqual({ x: 60, y: 360 })
    // 完成卡更高(底边 457):同一位置露出 37%,仍允许
    expect(resolveSceneElementHome('rescue', { x: 60, y: 360 }, uiKeepoutsFor('complete'))).toEqual({ x: 60, y: 360 })
    // 靠着按钮组也行:只盖住篮子下面三成
    expect(resolveSceneElementHome('rescue', { x: 1040, y: 700 })).toEqual({ x: 1040, y: 676 })
  })

  it('moves any element dropped fully behind the board to the nearest grabbable spot, staying clamped', () => {
    for (const elementId of MOVABLE_FARM_ELEMENT_IDS) {
      for (const drop of [{ x: 30, y: 180 }, { x: 300, y: 300 }, { x: 400, y: 100 }, { x: 12, y: 430 }, { x: 0, y: 0 }]) {
        const home = resolveSceneElementHome(elementId, drop)!
        expect([elementId, drop, blocked(elementId, home)]).toEqual([elementId, drop, false])
        expect(home).toEqual(clampSceneElementHome(elementId, home))
      }
    }
  })

  it('repairs persisted homes that already sit behind the board, moving them as little as possible', () => {
    const rescue = normalizeSceneElementHomes({ rescue: { x: 60, y: 190 } }).rescue!
    expect(blocked('rescue', rescue)).toBe(false)
    expect(rescue.x).toBe(60)
    expect(rescue.y).toBeGreaterThan(190)
    const hatchery = normalizeSceneElementHomes({ hatchery: { x: 12, y: 200 } }).hatchery!
    expect(blocked('hatchery', hatchery)).toBe(false)
    // 只被卡片盖住右边一小条:露出七成,原地不动
    expect(normalizeSceneElementHomes({ rescue: { x: 400, y: 100 } })).toEqual({ rescue: { x: 400, y: 100 } })
  })

  it('leaves drag-time clamping free to follow the finger across the board', () => {
    expect(clampSceneElementHome('rescue', { x: 60, y: 190 })).toEqual({ x: 60, y: 190 })
  })
})
