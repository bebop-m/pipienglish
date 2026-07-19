import { describe, expect, it } from 'vitest'
import {
  COSMETIC_EGG_PRICES,
  DEFAULT_CHARACTER_LOADOUT,
  DEFAULT_NORMAL_CHICK_VARIANT_ID,
  DECORATION_COUNTS_PER_CHAPTER,
  DECORATION_EGG_PRICES,
  FULL_CHAPTER_COSMETIC_COST,
  FULL_CHAPTER_DECORATION_COST,
} from './farmCatalog'

describe('默认内容 ID', () => {
  it('为旧鸡和标准角色造型提供与位图路径解耦的稳定 ID', () => {
    expect(DEFAULT_NORMAL_CHICK_VARIANT_ID).toBe('chick-normal-default-f4')
    expect(DEFAULT_CHARACTER_LOADOUT).toEqual({
      xiaopi: {
        headLook: 'xiaopi-headlook-default-straw-hat-f4',
        outfit: 'xiaopi-outfit-default-blue-overalls-f4',
        accessory: null,
      },
      mother: { headwear: null, neckwear: null },
    })
  })
})

describe('完整章节目录价格', () => {
  it('贴纸 4×5 + 3×10 + 2×20 = 90', () => {
    expect(DECORATION_EGG_PRICES).toEqual({ small: 5, medium: 10, landmark: 20 })
    expect(DECORATION_COUNTS_PER_CHAPTER).toEqual({ small: 4, medium: 3, landmark: 2 })
    expect(FULL_CHAPTER_DECORATION_COST).toBe(90)
  })

  it('小皮四件与母鸡两件装扮合计 80', () => {
    expect(COSMETIC_EGG_PRICES).toEqual({
      xiaopi_hair: 15,
      xiaopi_hat_look: 15,
      xiaopi_outfit: 20,
      xiaopi_accessory: 10,
      mother_headwear: 10,
      mother_neckwear: 10,
    })
    expect(FULL_CHAPTER_COSMETIC_COST).toBe(80)
  })
})
