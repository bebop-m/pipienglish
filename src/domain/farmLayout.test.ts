import { describe, expect, it } from 'vitest'
import {
  clampSceneElementHome,
  normalizeSceneElementHomes,
  SCENE_ELEMENT_LAYOUTS,
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
