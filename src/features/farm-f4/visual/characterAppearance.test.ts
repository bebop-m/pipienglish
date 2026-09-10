import { describe, expect, it } from 'vitest'
import { DEFAULT_CHARACTER_LOADOUT, type CharacterLoadout } from '../../../domain/farmCatalog'
import { characterAppearanceAssetId, SCENE_2_COSMETIC_IDS } from './characterAppearance'

const fallbackXiaopi = 'scenes/scene-2/xiaopi.png'
const fallbackMother = 'scenes/scene-2/mother.png'

function loadout(
  xiaopi: Partial<CharacterLoadout['xiaopi']> = {},
  mother: Partial<CharacterLoadout['mother']> = {},
): CharacterLoadout {
  return {
    xiaopi: { ...DEFAULT_CHARACTER_LOADOUT.xiaopi, ...xiaopi },
    mother: { ...DEFAULT_CHARACTER_LOADOUT.mother, ...mother },
  }
}

describe('scene 2 character appearance matrix', () => {
  it.each([
    ['default', {}, fallbackXiaopi],
    ['hair', { headLook: SCENE_2_COSMETIC_IDS.xiaopiHair }, 'scenes/scene-2/cosmetics/xiaopi-hair-default-none.png'],
    ['bonnet', { headLook: SCENE_2_COSMETIC_IDS.xiaopiBonnet }, 'scenes/scene-2/cosmetics/xiaopi-bonnet-default-none.png'],
    ['overalls', { outfit: SCENE_2_COSMETIC_IDS.xiaopiOveralls }, 'scenes/scene-2/cosmetics/xiaopi-default-overalls-none.png'],
    ['satchel', { accessory: SCENE_2_COSMETIC_IDS.xiaopiSatchel }, 'scenes/scene-2/cosmetics/xiaopi-default-default-satchel.png'],
    ['hair overalls', { headLook: SCENE_2_COSMETIC_IDS.xiaopiHair, outfit: SCENE_2_COSMETIC_IDS.xiaopiOveralls }, 'scenes/scene-2/cosmetics/xiaopi-hair-overalls-none.png'],
    ['bonnet overalls', { headLook: SCENE_2_COSMETIC_IDS.xiaopiBonnet, outfit: SCENE_2_COSMETIC_IDS.xiaopiOveralls }, 'scenes/scene-2/cosmetics/xiaopi-bonnet-overalls-none.png'],
    ['hair satchel', { headLook: SCENE_2_COSMETIC_IDS.xiaopiHair, accessory: SCENE_2_COSMETIC_IDS.xiaopiSatchel }, 'scenes/scene-2/cosmetics/xiaopi-hair-default-satchel.png'],
    ['bonnet satchel', { headLook: SCENE_2_COSMETIC_IDS.xiaopiBonnet, accessory: SCENE_2_COSMETIC_IDS.xiaopiSatchel }, 'scenes/scene-2/cosmetics/xiaopi-bonnet-default-satchel.png'],
    ['overalls satchel', { outfit: SCENE_2_COSMETIC_IDS.xiaopiOveralls, accessory: SCENE_2_COSMETIC_IDS.xiaopiSatchel }, 'scenes/scene-2/cosmetics/xiaopi-default-overalls-satchel.png'],
    ['hair overalls satchel', { headLook: SCENE_2_COSMETIC_IDS.xiaopiHair, outfit: SCENE_2_COSMETIC_IDS.xiaopiOveralls, accessory: SCENE_2_COSMETIC_IDS.xiaopiSatchel }, 'scenes/scene-2/cosmetics/xiaopi-hair-overalls-satchel.png'],
    ['bonnet overalls satchel', { headLook: SCENE_2_COSMETIC_IDS.xiaopiBonnet, outfit: SCENE_2_COSMETIC_IDS.xiaopiOveralls, accessory: SCENE_2_COSMETIC_IDS.xiaopiSatchel }, 'scenes/scene-2/cosmetics/xiaopi-bonnet-overalls-satchel.png'],
  ])('resolves Xiaopi %s', (_label, xiaopi, expected) => {
    expect(characterAppearanceAssetId('scene-2', 'xiaopi', loadout(xiaopi), fallbackXiaopi)).toBe(expected)
  })

  it.each([
    ['default', {}, fallbackMother],
    ['bonnet', { headwear: SCENE_2_COSMETIC_IDS.motherBonnet }, 'scenes/scene-2/cosmetics/mother-bonnet-none.png'],
    ['neckerchief', { neckwear: SCENE_2_COSMETIC_IDS.motherNeckerchief }, 'scenes/scene-2/cosmetics/mother-default-neckerchief.png'],
    ['bonnet neckerchief', { headwear: SCENE_2_COSMETIC_IDS.motherBonnet, neckwear: SCENE_2_COSMETIC_IDS.motherNeckerchief }, 'scenes/scene-2/cosmetics/mother-bonnet-neckerchief.png'],
  ])('resolves mother %s', (_label, mother, expected) => {
    expect(characterAppearanceAssetId('scene-2', 'mother', loadout({}, mother), fallbackMother)).toBe(expected)
  })

  it('does not leak scene 2 clothes into another scene', () => {
    expect(characterAppearanceAssetId(
      'scene-1',
      'xiaopi',
      loadout({ headLook: SCENE_2_COSMETIC_IDS.xiaopiBonnet, outfit: SCENE_2_COSMETIC_IDS.xiaopiOveralls }),
      'xiaopi-f3.png',
    )).toBe('xiaopi-f3.png')
  })
})
