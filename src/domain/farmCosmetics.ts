import { COSMETIC_EGG_PRICES, type CosmeticCatalogKind } from './farmCatalog'
import type { SceneAssetStatus } from './farmScenes'

export type CharacterTarget = 'xiaopi' | 'mother'
export type XiaopiCosmeticSlot = 'headLook' | 'outfit' | 'accessory'
export type MotherCosmeticSlot = 'headwear' | 'neckwear'
export type CharacterCosmeticSlot = XiaopiCosmeticSlot | MotherCosmeticSlot

interface CosmeticItemBase {
  id: string
  unlockSceneId: string
  catalogKind: CosmeticCatalogKind
  eggCost: 10 | 15 | 20
  releaseTier: 'core' | 'extension'
  assetStatus: SceneAssetStatus
  /** 稳定逻辑 ID；不得指向阶段 A 候选文件路径。 */
  layerManifestId: string
}

export type CosmeticItemDefinition =
  | (CosmeticItemBase & { target: 'xiaopi'; slot: XiaopiCosmeticSlot })
  | (CosmeticItemBase & { target: 'mother'; slot: MotherCosmeticSlot })

function internalCosmetic(
  id: string,
  catalogKind: CosmeticCatalogKind,
  target: CharacterTarget,
  slot: CharacterCosmeticSlot,
  releaseTier: 'core' | 'extension',
): CosmeticItemDefinition {
  return {
    id,
    unlockSceneId: 'scene-1',
    catalogKind,
    target,
    slot,
    eggCost: COSMETIC_EGG_PRICES[catalogKind],
    releaseTier,
    assetStatus: 'internal-placeholder',
    layerManifestId: `internal-placeholder:${id}`,
  } as CosmeticItemDefinition
}

/** 当前批准且可在儿童衣柜列出的装扮。新增条目必须同时进入离线资产清单。 */
export const FARM_COSMETIC_DEFINITIONS: readonly CosmeticItemDefinition[] = []

/** 场景 1 完整 80 蛋目录的稳定逻辑草案；只供测试/内部技术闭环，不进入儿童目录。 */
export const INTERNAL_SCENE_1_COSMETIC_DRAFTS: readonly CosmeticItemDefinition[] = [
  internalCosmetic('xiaopi-accessory-scene-1-core', 'xiaopi_accessory', 'xiaopi', 'accessory', 'core'),
  internalCosmetic('xiaopi-hair-scene-1-extension', 'xiaopi_hair', 'xiaopi', 'headLook', 'extension'),
  internalCosmetic('xiaopi-hat-look-scene-1-extension', 'xiaopi_hat_look', 'xiaopi', 'headLook', 'extension'),
  internalCosmetic('xiaopi-outfit-scene-1-extension', 'xiaopi_outfit', 'xiaopi', 'outfit', 'extension'),
  internalCosmetic('mother-headwear-scene-1-extension', 'mother_headwear', 'mother', 'headwear', 'extension'),
  internalCosmetic('mother-neckwear-scene-1-extension', 'mother_neckwear', 'mother', 'neckwear', 'extension'),
]

export function cosmeticById(
  itemId: string,
  definitions: readonly CosmeticItemDefinition[] = FARM_COSMETIC_DEFINITIONS,
): CosmeticItemDefinition | null {
  return definitions.find(item => item.id === itemId) ?? null
}
