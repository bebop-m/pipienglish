import { describe, expect, it } from 'vitest'
import { FULL_CHAPTER_COSMETIC_COST } from './farmCatalog'
import {
  FARM_COSMETIC_DEFINITIONS,
  INTERNAL_SCENE_1_COSMETIC_DRAFTS,
  cosmeticById,
} from './farmCosmetics'

describe('scene 1 wardrobe catalog contract', () => {
  it('keeps the production catalog empty until approved assets are packaged', () => {
    expect(FARM_COSMETIC_DEFINITIONS).toEqual([])
    expect(cosmeticById('xiaopi-accessory-scene-1-core')).toBeNull()
  })

  it('keeps a stable six-item internal draft totaling 80 eggs', () => {
    expect(INTERNAL_SCENE_1_COSMETIC_DRAFTS).toHaveLength(6)
    expect(INTERNAL_SCENE_1_COSMETIC_DRAFTS.reduce((sum, item) => sum + item.eggCost, 0))
      .toBe(FULL_CHAPTER_COSMETIC_COST)
    expect(FULL_CHAPTER_COSMETIC_COST).toBe(80)
    expect(new Set(INTERNAL_SCENE_1_COSMETIC_DRAFTS.map(item => `${item.target}:${item.slot}`)))
      .toEqual(new Set([
        'xiaopi:headLook',
        'xiaopi:outfit',
        'xiaopi:accessory',
        'mother:headwear',
        'mother:neckwear',
      ]))
    expect(INTERNAL_SCENE_1_COSMETIC_DRAFTS.every(item => (
      item.assetStatus === 'internal-placeholder'
      && item.layerManifestId.startsWith('internal-placeholder:')
    ))).toBe(true)
  })
})
