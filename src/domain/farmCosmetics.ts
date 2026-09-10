import { COSMETIC_EGG_PRICES, type CosmeticCatalogKind } from './farmCatalog'
import type { SceneAssetStatus } from './farmScenes'

export type CharacterTarget = 'xiaopi' | 'mother'
export type XiaopiCosmeticSlot = 'headLook' | 'outfit' | 'accessory'
export type MotherCosmeticSlot = 'headwear' | 'neckwear'
export type CharacterCosmeticSlot = XiaopiCosmeticSlot | MotherCosmeticSlot

interface CosmeticItemBase {
  id: string
  displayName: string
  /** 衣柜卡片使用的单品试装图；角色实装由组合矩阵解析。 */
  previewAssetId: string
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
    displayName: id,
    previewAssetId: `internal-placeholder:${id}`,
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
export const FARM_COSMETIC_DEFINITIONS: readonly CosmeticItemDefinition[] = [
  {
    id: 'xiaopi-hair-scene-2-extension',
    displayName: '小皮 苹果花短发',
    previewAssetId: 'scenes/scene-2/cosmetics/xiaopi-hair-default-none.png',
    unlockSceneId: 'scene-2',
    catalogKind: 'xiaopi_hair',
    target: 'xiaopi',
    slot: 'headLook',
    eggCost: 15,
    releaseTier: 'extension',
    assetStatus: 'approved',
    layerManifestId: 'scene-2-composite-matrix:xiaopi-hair',
  },
  {
    id: 'xiaopi-hat-look-scene-2-extension',
    displayName: '小皮 果园头巾',
    previewAssetId: 'scenes/scene-2/cosmetics/xiaopi-bonnet-default-none.png',
    unlockSceneId: 'scene-2',
    catalogKind: 'xiaopi_hat_look',
    target: 'xiaopi',
    slot: 'headLook',
    eggCost: 15,
    releaseTier: 'extension',
    assetStatus: 'approved',
    layerManifestId: 'scene-2-composite-matrix:xiaopi-bonnet',
  },
  {
    id: 'xiaopi-outfit-scene-2-extension',
    displayName: '小皮 采果背带裤',
    previewAssetId: 'scenes/scene-2/cosmetics/xiaopi-default-overalls-none.png',
    unlockSceneId: 'scene-2',
    catalogKind: 'xiaopi_outfit',
    target: 'xiaopi',
    slot: 'outfit',
    eggCost: 20,
    releaseTier: 'extension',
    assetStatus: 'approved',
    layerManifestId: 'scene-2-composite-matrix:xiaopi-overalls',
  },
  {
    id: 'xiaopi-accessory-scene-2-extension',
    displayName: '小皮 苹果斜挎包',
    previewAssetId: 'scenes/scene-2/cosmetics/xiaopi-default-default-satchel.png',
    unlockSceneId: 'scene-2',
    catalogKind: 'xiaopi_accessory',
    target: 'xiaopi',
    slot: 'accessory',
    eggCost: 10,
    releaseTier: 'extension',
    assetStatus: 'approved',
    layerManifestId: 'scene-2-composite-matrix:xiaopi-satchel',
  },
  {
    id: 'mother-headwear-scene-2-core',
    displayName: '母鸡 果园小软帽',
    previewAssetId: 'scenes/scene-2/cosmetics/mother-bonnet-none.png',
    unlockSceneId: 'scene-2',
    catalogKind: 'mother_headwear',
    target: 'mother',
    slot: 'headwear',
    eggCost: 10,
    releaseTier: 'core',
    assetStatus: 'approved',
    layerManifestId: 'scene-2-composite-matrix:mother-bonnet',
  },
  {
    id: 'mother-neckwear-scene-2-extension',
    displayName: '母鸡 格纹小领巾',
    previewAssetId: 'scenes/scene-2/cosmetics/mother-default-neckerchief.png',
    unlockSceneId: 'scene-2',
    catalogKind: 'mother_neckwear',
    target: 'mother',
    slot: 'neckwear',
    eggCost: 10,
    releaseTier: 'extension',
    assetStatus: 'approved',
    layerManifestId: 'scene-2-composite-matrix:mother-neckerchief',
  },
]

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
