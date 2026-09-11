import { describe, expect, it } from 'vitest'
import {
  boxAvoidsKeepouts,
  clampBoxToStage,
  clampSceneElementHome,
  CUSTOMIZATION_ENTRANCE_KEEPOUT,
  DAILY_BOARD_KEEPOUT,
  fixedVisualLayout,
  MOVABLE_FARM_ELEMENT_IDS,
  normalizeSceneElementHomes,
  resolveElementHome,
  resolveSceneElementHome,
  SCENE_ELEMENT_LAYOUTS,
  STAGE_DRAG_INSETS,
} from './farmLayout'

function coversDailyBoard(elementId: keyof typeof SCENE_ELEMENT_LAYOUTS, home: { x: number; y: number }): boolean {
  const { size } = SCENE_ELEMENT_LAYOUTS[elementId]
  return home.x < DAILY_BOARD_KEEPOUT.right
    && home.x + size.width > DAILY_BOARD_KEEPOUT.left
    && home.y < DAILY_BOARD_KEEPOUT.bottom
    && home.y + size.height > DAILY_BOARD_KEEPOUT.top
}

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

describe('daily board keep-out', () => {
  it('keeps every default home outside the keep-outs', () => {
    for (const elementId of MOVABLE_FARM_ELEMENT_IDS) {
      const { defaultHome } = SCENE_ELEMENT_LAYOUTS[elementId]
      expect([elementId, coversDailyBoard(elementId, defaultHome)]).toEqual([elementId, false])
      expect(resolveSceneElementHome(elementId, defaultHome)).toEqual(defaultHome)
    }
  })

  it('pushes any element dropped on the daily board back out of it', () => {
    for (const elementId of MOVABLE_FARM_ELEMENT_IDS) {
      for (const drop of [{ x: 30, y: 180 }, { x: 300, y: 300 }, { x: 400, y: 100 }, { x: 12, y: 430 }, { x: 0, y: 0 }]) {
        const home = resolveSceneElementHome(elementId, drop)!
        expect([elementId, drop, coversDailyBoard(elementId, home)]).toEqual([elementId, drop, false])
        expect(home).toEqual(clampSceneElementHome(elementId, home))
      }
    }
  })

  it('pushes the rescue basket out from under the bottom-right buttons', () => {
    const home = resolveSceneElementHome('rescue', { x: 1040, y: 700 })!
    const { size } = SCENE_ELEMENT_LAYOUTS.rescue
    expect(home.y + size.height <= CUSTOMIZATION_ENTRANCE_KEEPOUT.top || home.x + size.width <= CUSTOMIZATION_ENTRANCE_KEEPOUT.left).toBe(true)
  })

  it('repairs persisted homes that already sit behind the daily board', () => {
    expect(normalizeSceneElementHomes({ rescue: { x: 60, y: 190 } })).toEqual({ rescue: { x: 60, y: 460 } })
    expect(normalizeSceneElementHomes({ hatchery: { x: 12, y: 200 } })).toEqual({ hatchery: { x: 12, y: 460 } })
    expect(normalizeSceneElementHomes({ rescue: { x: 400, y: 100 } })).toEqual({ rescue: { x: 418, y: 100 } })
  })

  it('leaves drag-time clamping free to follow the finger across the board', () => {
    expect(clampSceneElementHome('rescue', { x: 60, y: 190 })).toEqual({ x: 60, y: 190 })
  })
})
