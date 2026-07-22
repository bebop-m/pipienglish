import { describe, expect, it } from 'vitest'
import { availableChapter } from './farmChapters'
import {
  FARM_SCENE_DEFINITIONS,
  FUTURE_FARM_SCENE_DRAFTS,
  sceneByChapter,
  sceneById,
} from './farmScenes'

describe('scene release package', () => {
  it('publishes scene 1 only and keeps scene 2 outside production lookup', () => {
    expect(availableChapter(FARM_SCENE_DEFINITIONS)).toBe(1)
    expect(FARM_SCENE_DEFINITIONS.map(scene => scene.id)).toEqual(['scene-1'])
    expect(sceneById('scene-2')).toBeNull()
    expect(sceneByChapter(2)).toBeNull()

    const futureDefinitions = [...FARM_SCENE_DEFINITIONS, ...FUTURE_FARM_SCENE_DRAFTS]
    const sceneTwo = sceneById('scene-2', futureDefinitions)
    expect(sceneTwo?.assetStatus).toBe('internal-placeholder')
    expect(sceneTwo?.backgroundAssetId).toBe('scenes/scene-2/orchard-background.png')
    expect(sceneByChapter(2, futureDefinitions)?.id).toBe('scene-2')
  })

  it('registers all eight approved hatchery states without publishing scene 2', () => {
    const scenes = [...FARM_SCENE_DEFINITIONS, ...FUTURE_FARM_SCENE_DRAFTS]
    for (const scene of scenes) {
      expect(Object.keys(scene.hatcheryVisualStates)).toEqual([
        'empty',
        'whole',
        'hairlineCrack',
        'largeCrack',
        'twoShells',
        'normalHatch',
        'colorHatch',
        'specialHatch',
      ])
      expect(Object.values(scene.hatcheryVisualStates).every(assetId => assetId.startsWith(`scenes/${scene.id}/hatchery/`))).toBe(true)
      expect(scene.hatcheryRenderBox).toEqual({ x: 58, y: 643, width: 177, height: 177 })
      expect(scene.chickVariantIds.color).toEqual(['chick-color-approved-b'])
      expect(scene.chickVariantIds.special).toEqual(['chick-special-approved-f'])
    }
    expect(FARM_SCENE_DEFINITIONS.map(scene => scene.id)).toEqual(['scene-1'])
  })

  it('defines the complete scene 1 sticker economy without exposing draft art', () => {
    const scene = FARM_SCENE_DEFINITIONS[0]
    const counts = scene.decorationCatalog.reduce<Record<string, number>>((result, item) => {
      result[item.kind] = (result[item.kind] ?? 0) + 1
      return result
    }, {})

    expect(counts).toEqual({ small: 4, medium: 3, landmark: 2 })
    expect(scene.decorationCatalog.reduce((sum, item) => sum + item.eggCost, 0)).toBe(90)
    expect(scene.decorationCatalog.filter(item => item.releaseTier === 'core')).toHaveLength(3)
    expect(scene.decorationCatalog.filter(item => item.releaseTier === 'extension')).toHaveLength(6)
    expect(scene.decorationCatalog.every(item => item.assetStatus === 'internal-placeholder')).toBe(true)
    expect(scene.decorationCatalog.every(item => item.assetId.startsWith('internal-placeholder:'))).toBe(true)
  })

  it('provides bounded, stable ground-anchor contracts for back/actor/front placement', () => {
    const items = FARM_SCENE_DEFINITIONS[0].decorationCatalog
    expect(new Set(items.map(item => item.layer))).toEqual(new Set(['back', 'actor', 'front']))

    for (const item of items) {
      expect(item.sceneId).toBe('scene-1')
      expect(item.placementBounds.xMin).toBeLessThan(item.placementBounds.xMax)
      expect(item.placementBounds.yMin).toBeLessThan(item.placementBounds.yMax)
      expect(item.render.canvasPx).toEqual({ width: 1254, height: 1254 })
      expect(item.render.displayBoxPt.width).toBeGreaterThan(0)
      expect(item.render.displayBoxPt.height).toBeGreaterThan(0)
      expect(item.render.groundAnchorPx.x).toBeGreaterThan(0)
      expect(item.render.groundAnchorPx.y).toBeGreaterThan(0)
    }
  })
})
