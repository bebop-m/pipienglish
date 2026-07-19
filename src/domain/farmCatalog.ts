export type DecorationKind = 'small' | 'medium' | 'landmark'
export type CosmeticCatalogKind =
  | 'xiaopi_hair'
  | 'xiaopi_hat_look'
  | 'xiaopi_outfit'
  | 'xiaopi_accessory'
  | 'mother_headwear'
  | 'mother_neckwear'

/**
 * 迁移和默认装备使用稳定的逻辑目录 ID，不是图片路径。后续资产清单可以把这些
 * ID 映射到批准的 F4 位图，但备份与数据库迁移不得依赖文件名。
 */
export const DEFAULT_NORMAL_CHICK_VARIANT_ID = 'chick-normal-default-f4' as const
/** 稳定逻辑 ID；对应稀有小鸡资产映射待框架 8 批准。 */
export const SCENE_1_COLOR_CHICK_VARIANT_IDS = [
  'chick-color-scene-1-a',
  'chick-color-scene-1-b',
] as const
export const SCENE_1_SPECIAL_CHICK_VARIANT_IDS = [
  'chick-special-scene-1-a',
] as const
export const DEFAULT_XIAOPI_HEAD_LOOK_ID = 'xiaopi-headlook-default-straw-hat-f4' as const
export const DEFAULT_XIAOPI_OUTFIT_ID = 'xiaopi-outfit-default-blue-overalls-f4' as const

export interface CharacterLoadout {
  xiaopi: {
    headLook: string
    outfit: string
    accessory: string | null
  }
  mother: {
    headwear: string | null
    neckwear: string | null
  }
}

export const DEFAULT_CHARACTER_LOADOUT: Readonly<CharacterLoadout> = {
  xiaopi: {
    headLook: DEFAULT_XIAOPI_HEAD_LOOK_ID,
    outfit: DEFAULT_XIAOPI_OUTFIT_ID,
    accessory: null,
  },
  mother: {
    headwear: null,
    neckwear: null,
  },
}

export const DECORATION_EGG_PRICES = {
  small: 5,
  medium: 10,
  landmark: 20,
} as const satisfies Readonly<Record<DecorationKind, 5 | 10 | 20>>

export const DECORATION_COUNTS_PER_CHAPTER = {
  small: 4,
  medium: 3,
  landmark: 2,
} as const satisfies Readonly<Record<DecorationKind, number>>

export const COSMETIC_EGG_PRICES = {
  xiaopi_hair: 15,
  xiaopi_hat_look: 15,
  xiaopi_outfit: 20,
  xiaopi_accessory: 10,
  mother_headwear: 10,
  mother_neckwear: 10,
} as const satisfies Readonly<Record<CosmeticCatalogKind, 10 | 15 | 20>>

export const FULL_CHAPTER_DECORATION_COST = Object.entries(DECORATION_EGG_PRICES)
  .reduce((total, [kind, price]) => total + price * DECORATION_COUNTS_PER_CHAPTER[kind as DecorationKind], 0)

export const FULL_CHAPTER_COSMETIC_COST = Object.values(COSMETIC_EGG_PRICES)
  .reduce((total, price) => total + price, 0)
