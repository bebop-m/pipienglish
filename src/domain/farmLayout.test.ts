import { describe, expect, it } from 'vitest'
import {
  clampSceneElementHome,
  MOVABLE_FARM_ELEMENT_IDS,
  normalizeSceneElementHomes,
  resolveSceneElementHome,
  SCENE_ELEMENT_LAYOUTS,
} from './farmLayout'

/** 与 farmLayout 内 DAILY_BOARD_KEEPOUT 同值：任务卡片保留区，物件落进去就再也点不到。 */
const KEEPOUT = { left: 24, top: 88, right: 418, bottom: 460 }

function coversDailyBoard(elementId: keyof typeof SCENE_ELEMENT_LAYOUTS, home: { x: number; y: number }): boolean {
  const { size } = SCENE_ELEMENT_LAYOUTS[elementId]
  return home.x < KEEPOUT.right
    && home.x + size.width > KEEPOUT.left
    && home.y < KEEPOUT.bottom
    && home.y + size.height > KEEPOUT.top
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

  it('clamps corrupted backup coordinates into each element safe area', () => {
    expect(normalizeSceneElementHomes({
      mother: { x: -50_000, y: 50_000 },
      xiaopi: { x: 50_000, y: -50_000 },
      hatchery: { x: 50_000, y: -50_000 },
      rescue: { x: -50_000, y: 50_000 },
    })).toEqual({
      mother: { x: 18, y: 604 },
      xiaopi: { x: 924, y: 300 },
      hatchery: { x: 878, y: 180 },
      rescue: { x: 12, y: 672 },
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
})

describe('daily board keep-out', () => {
  it('keeps every default home outside the daily board', () => {
    for (const elementId of MOVABLE_FARM_ELEMENT_IDS) {
      const { defaultHome } = SCENE_ELEMENT_LAYOUTS[elementId]
      expect([elementId, coversDailyBoard(elementId, defaultHome)]).toEqual([elementId, false])
      expect(resolveSceneElementHome(elementId, defaultHome)).toEqual(defaultHome)
    }
  })

  it('pushes any element dropped on the daily board back out of it', () => {
    for (const elementId of MOVABLE_FARM_ELEMENT_IDS) {
      for (const drop of [{ x: 30, y: 180 }, { x: 300, y: 300 }, { x: 400, y: 100 }, { x: 12, y: 430 }]) {
        const home = resolveSceneElementHome(elementId, drop)!
        expect([elementId, drop, coversDailyBoard(elementId, home)]).toEqual([elementId, drop, false])
        expect(home).toEqual(clampSceneElementHome(elementId, home))
      }
    }
  })

  it('repairs persisted homes that already sit behind the daily board', () => {
    expect(normalizeSceneElementHomes({ rescue: { x: 60, y: 190 } })).toEqual({ rescue: { x: 60, y: 460 } })
    expect(normalizeSceneElementHomes({ hatchery: { x: 12, y: 200 } })).toEqual({ hatchery: { x: 12, y: 460 } })
    expect(normalizeSceneElementHomes({ rescue: { x: 400, y: 100 } })).toEqual({ rescue: { x: 418, y: 180 } })
  })

  it('leaves drag-time clamping free to follow the finger across the board', () => {
    expect(clampSceneElementHome('rescue', { x: 60, y: 190 })).toEqual({ x: 60, y: 190 })
  })
})
