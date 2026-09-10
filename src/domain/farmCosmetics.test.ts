import { describe, expect, it } from 'vitest'
import { FULL_CHAPTER_COSMETIC_COST } from './farmCatalog'
import {
  FARM_COSMETIC_DEFINITIONS,
  INTERNAL_SCENE_1_COSMETIC_DRAFTS,
  cosmeticById,
} from './farmCosmetics'

describe('wardrobe catalog contract', () => {
  it('publishes the approved six-item scene 2 wardrobe totaling 80 eggs', () => {
    expect(FARM_COSMETIC_DEFINITIONS).toHaveLength(6)
    expect(FARM_COSMETIC_DEFINITIONS.reduce((sum, item) => sum + item.eggCost, 0))
      .toBe(FULL_CHAPTER_COSMETIC_COST)
    expect(FARM_COSMETIC_DEFINITIONS.every(item => (
      item.unlockSceneId === 'scene-2'
      && item.assetStatus === 'approved'
      && item.previewAssetId.startsWith('scenes/scene-2/cosmetics/')
      && item.layerManifestId.startsWith('scene-2-composite-matrix:')
    ))).toBe(true)
    expect(new Set(FARM_COSMETIC_DEFINITIONS.map(item => item.displayName)).size).toBe(6)
    expect(cosmeticById('xiaopi-accessory-scene-1-core')).toBeNull()
    expect(cosmeticById('mother-headwear-scene-2-core')?.displayName).toBe('母鸡 果园小软帽')
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
