import type { CharacterLoadout } from '../../../domain/farmCatalog'
import type { CharacterTarget } from '../../../domain/farmCosmetics'

export const SCENE_2_COSMETIC_IDS = {
  xiaopiHair: 'xiaopi-hair-scene-2-extension',
  xiaopiBonnet: 'xiaopi-hat-look-scene-2-extension',
  xiaopiOveralls: 'xiaopi-outfit-scene-2-extension',
  xiaopiSatchel: 'xiaopi-accessory-scene-2-extension',
  motherBonnet: 'mother-headwear-scene-2-core',
  motherNeckerchief: 'mother-neckwear-scene-2-extension',
} as const

const XIAOPI_MATRIX: Readonly<Record<string, string>> = {
  'hair:default:none': 'scenes/scene-2/cosmetics/xiaopi-hair-default-none.png',
  'bonnet:default:none': 'scenes/scene-2/cosmetics/xiaopi-bonnet-default-none.png',
  'default:overalls:none': 'scenes/scene-2/cosmetics/xiaopi-default-overalls-none.png',
  'default:default:satchel': 'scenes/scene-2/cosmetics/xiaopi-default-default-satchel.png',
  'hair:overalls:none': 'scenes/scene-2/cosmetics/xiaopi-hair-overalls-none.png',
  'bonnet:overalls:none': 'scenes/scene-2/cosmetics/xiaopi-bonnet-overalls-none.png',
  'hair:default:satchel': 'scenes/scene-2/cosmetics/xiaopi-hair-default-satchel.png',
  'bonnet:default:satchel': 'scenes/scene-2/cosmetics/xiaopi-bonnet-default-satchel.png',
  'default:overalls:satchel': 'scenes/scene-2/cosmetics/xiaopi-default-overalls-satchel.png',
  'hair:overalls:satchel': 'scenes/scene-2/cosmetics/xiaopi-hair-overalls-satchel.png',
  'bonnet:overalls:satchel': 'scenes/scene-2/cosmetics/xiaopi-bonnet-overalls-satchel.png',
}

const MOTHER_MATRIX: Readonly<Record<string, string>> = {
  'bonnet:none': 'scenes/scene-2/cosmetics/mother-bonnet-none.png',
  'default:neckerchief': 'scenes/scene-2/cosmetics/mother-default-neckerchief.png',
  'bonnet:neckerchief': 'scenes/scene-2/cosmetics/mother-bonnet-neckerchief.png',
}

/**
 * 场景 2 角色是经过批准的整身水彩图。这里按稳定装备 ID 选择完整组合图，
 * 避免透明衣片覆盖旧帽子、围裙等原造型而产生穿帮。
 */
export function characterAppearanceAssetId(
  sceneId: string,
  target: CharacterTarget,
  loadout: CharacterLoadout,
  fallbackAssetId: string,
): string {
  if (sceneId !== 'scene-2') return fallbackAssetId
  if (target === 'xiaopi') {
    const head = loadout.xiaopi.headLook === SCENE_2_COSMETIC_IDS.xiaopiHair
      ? 'hair'
      : loadout.xiaopi.headLook === SCENE_2_COSMETIC_IDS.xiaopiBonnet
        ? 'bonnet'
        : 'default'
    const outfit = loadout.xiaopi.outfit === SCENE_2_COSMETIC_IDS.xiaopiOveralls ? 'overalls' : 'default'
    const accessory = loadout.xiaopi.accessory === SCENE_2_COSMETIC_IDS.xiaopiSatchel ? 'satchel' : 'none'
    return XIAOPI_MATRIX[`${head}:${outfit}:${accessory}`] ?? fallbackAssetId
  }

  const headwear = loadout.mother.headwear === SCENE_2_COSMETIC_IDS.motherBonnet ? 'bonnet' : 'default'
  const neckwear = loadout.mother.neckwear === SCENE_2_COSMETIC_IDS.motherNeckerchief ? 'neckerchief' : 'none'
  return MOTHER_MATRIX[`${headwear}:${neckwear}`] ?? fallbackAssetId
}
