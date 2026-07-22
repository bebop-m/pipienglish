import { describe, expect, it } from 'vitest'
import type { FarmChickVM, FarmSceneVM } from '../../../application/viewmodel'
import { FARM_SCENE_DEFINITIONS, FUTURE_FARM_SCENE_DRAFTS } from '../../../domain/farmScenes'
import { chickAssetId, chickCanvasSize, specialChickHome } from './chickVisual'

function sceneVM(index: 0 | 1): FarmSceneVM {
  const definition = index === 0 ? FARM_SCENE_DEFINITIONS[0] : FUTURE_FARM_SCENE_DRAFTS[0]
  return definition as unknown as FarmSceneVM
}

function chick(rarity: FarmChickVM['rarity'], variantId: string) {
  return { rarity, variantId }
}

describe('冻结小鸡资产映射', () => {
  it.each([0, 1] as const)('场景 %s 共享普通、异色 B 和特殊 F', index => {
    const scene = sceneVM(index)
    expect(chickAssetId(chick('normal', 'chick-normal-default-f4'), scene)).toBe('chick-f3.png')
    expect(chickAssetId(chick('color', 'chick-color-approved-b'), scene)).toBe('chicks/chick-color-approved-b.png')
    expect(chickAssetId(chick('special', 'chick-special-approved-f'), scene)).toBe('chicks/chick-special-approved-f.png')
  })

  it('旧 variantId 只按原 rarity 回退，不会落回普通小鸡', () => {
    expect(chickAssetId(chick('special', 'legacy-special'), sceneVM(0))).toBe('chicks/chick-special-approved-f.png')
    expect(chickAssetId(chick('color', 'legacy-color'), sceneVM(0))).toBe('chicks/chick-color-approved-b.png')
  })

  it('特殊 F 使用批准的 141 画布并换算两场景 foot anchor', () => {
    expect(chickCanvasSize(chick('normal', 'normal'))).toBe(116)
    expect(chickCanvasSize(chick('color', 'color'))).toBe(116)
    expect(chickCanvasSize(chick('special', 'special'))).toBe(141)
    expect(specialChickHome(sceneVM(0).characterVisuals.specialChickAnchor)).toEqual({ x: 1010, y: 667 })
    expect(specialChickHome(sceneVM(1).characterVisuals.specialChickAnchor)).toEqual({ x: 1024, y: 667 })
  })
})
