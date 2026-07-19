import { describe, expect, it, vi } from 'vitest'
import { INTERNAL_SCENE_1_COSMETIC_DRAFTS } from '../domain/farmCosmetics'
import { FARM_SCENE_DEFINITIONS, FUTURE_FARM_SCENE_DRAFTS } from '../domain/farmScenes'
import { exportAll, importAll } from './backup'
import { getFarmStateV3, PipiDB, setFarmStateV3 } from './db'
import { defaultFarmStateV3 } from './farmPersistence'
import { createFarmUsecases } from './usecases/farmHome'

let dbSequence = 0
const freshDb = () => new PipiDB(`pipitest-customization-${Date.now()}-${dbSequence++}`)
const now = new Date('2026-07-19T09:00:00+08:00').getTime()
const context = { now, today: '2026-07-19' }
const internalSources = {
  includeInternalPlaceholders: true,
  cosmeticDefinitions: INTERNAL_SCENE_1_COSMETIC_DRAFTS,
} as const

async function seedEggs(db: PipiDB, eggStock = 200) {
  await setFarmStateV3(db, { ...defaultFarmStateV3(), henName: 'Coco', eggStock })
}

describe('framework 7 release gating', () => {
  it('publishes only scene 1 and hides every unapproved catalog entry in production', async () => {
    const db = freshDb()
    await seedEggs(db)
    const vm = await createFarmUsecases(db).loadViewModel(now)

    expect(vm.availableChapter).toBe(1)
    expect(vm.enterableChapter).toBe(1)
    expect(vm.sceneMap.map(scene => scene.id)).toEqual(['scene-1'])
    expect(vm.decorationCatalog).toEqual([])
    expect(vm.wardrobeCatalog).toEqual([])
    expect(vm.loadout.xiaopi.outfit).toBeTruthy()
    db.close()
  })

  it('exposes the complete technical catalog only when the internal test gate is explicit', async () => {
    const db = freshDb()
    await seedEggs(db)
    const vm = await createFarmUsecases(db, internalSources).loadViewModel(now)
    expect(vm.decorationCatalog).toHaveLength(9)
    expect(vm.wardrobeCatalog).toHaveLength(6)
    expect(vm.decorationCatalog.reduce((sum, item) => sum + item.definition.eggCost, 0)).toBe(90)
    expect(vm.wardrobeCatalog.reduce((sum, item) => sum + item.definition.eggCost, 0)).toBe(80)
    db.close()
  })
})

describe('decoration ownership and placement transactions', () => {
  it('leaves both ownership and balance unchanged when eggs are insufficient', async () => {
    const db = freshDb()
    await seedEggs(db, 4)
    const uc = createFarmUsecases(db, internalSources)
    const item = FARM_SCENE_DEFINITIONS[0].decorationCatalog[0]
    expect(await uc.buyDecoration('scene-1', item.id, now))
      .toEqual({ status: 'insufficient-eggs', chargedEggs: 0 })
    expect(await db.decorations.count()).toBe(0)
    expect((await getFarmStateV3(db, context)).eggStock).toBe(4)
    db.close()
  })

  it('charges one rapid repeated purchase once and allows free move, store and re-place', async () => {
    const db = freshDb()
    await seedEggs(db, 100)
    const uc = createFarmUsecases(db, internalSources)
    const item = FARM_SCENE_DEFINITIONS[0].decorationCatalog[0]
    const results = await Promise.all([
      uc.buyDecoration('scene-1', item.id, now),
      uc.buyDecoration('scene-1', item.id, now),
    ])

    expect(results.map(result => result.status).sort()).toEqual(['already-owned', 'purchased'])
    expect(await db.decorations.count()).toBe(1)
    expect((await getFarmStateV3(db, context)).eggStock).toBe(95)

    expect(await uc.placeDecoration('scene-1', item.id, { x: 600, y: 700 }, now + 1))
      .toEqual({ status: 'placed', chargedEggs: 0 })
    expect(await uc.placeDecoration('scene-1', item.id, { x: 650, y: 720 }, now + 2))
      .toEqual({ status: 'placed', chargedEggs: 0 })
    expect(await uc.storeDecoration('scene-1', item.id, now + 3))
      .toEqual({ status: 'stored', chargedEggs: 0 })
    expect(await db.decorations.get(['scene-1', item.id])).toMatchObject({ x: null, y: null })
    expect(await uc.placeDecoration('scene-1', item.id, { x: 700, y: 750 }, now + 4))
      .toEqual({ status: 'placed', chargedEggs: 0 })
    expect((await getFarmStateV3(db, context)).eggStock).toBe(95)

    expect(await uc.placeDecoration('scene-1', item.id, { x: -1, y: 700 }, now + 5))
      .toEqual({ status: 'outside-placement-bounds', chargedEggs: 0 })
    expect(await db.decorations.get(['scene-1', item.id])).toMatchObject({ x: 700, y: 750 })
    db.close()
  })

  it('rolls the ownership row back when the egg deduction cannot commit', async () => {
    const db = freshDb()
    await seedEggs(db, 20)
    const uc = createFarmUsecases(db, internalSources)
    const item = FARM_SCENE_DEFINITIONS[0].decorationCatalog[1]
    const putSpy = vi.spyOn(db.kv, 'put').mockRejectedValueOnce(new Error('forced farm write failure'))

    await expect(uc.buyDecoration('scene-1', item.id, now)).rejects.toThrow('forced farm write failure')
    putSpy.mockRestore()
    expect(await db.decorations.get(['scene-1', item.id])).toBeUndefined()
    expect((await getFarmStateV3(db, context)).eggStock).toBe(20)
    db.close()
  })

  it('binds each row to its purchased scene without changing the active journey state', async () => {
    const db = freshDb()
    await setFarmStateV3(db, {
      ...defaultFarmStateV3(),
      henName: 'Coco',
      eggStock: 100,
      activeSceneId: 'scene-2',
      acknowledgedSceneChapter: 2,
      cookingMeal: { recipeId: 'single_fried_egg', eggCost: 1, phase: 'raw', startedAt: now },
    })
    const definitions = [...FARM_SCENE_DEFINITIONS, ...FUTURE_FARM_SCENE_DRAFTS]
    const uc = createFarmUsecases(db, { ...internalSources, sceneDefinitions: definitions })
    const sceneOneItem = FARM_SCENE_DEFINITIONS[0].decorationCatalog[0]
    const sceneTwoItem = FUTURE_FARM_SCENE_DRAFTS[0].decorationCatalog[0]

    expect((await uc.buyDecoration('scene-1', sceneOneItem.id, now)).status).toBe('purchased')
    expect((await uc.buyDecoration('scene-2', sceneTwoItem.id, now)).status).toBe('purchased')
    await uc.placeDecoration('scene-1', sceneOneItem.id, { x: 600, y: 700 }, now)
    await uc.placeDecoration('scene-2', sceneTwoItem.id, { x: 650, y: 720 }, now)
    expect(await uc.placeDecoration('scene-2', sceneOneItem.id, { x: 700, y: 750 }, now))
      .toEqual({ status: 'scene-mismatch', chargedEggs: 0 })

    expect(await db.decorations.get(['scene-1', sceneOneItem.id])).toMatchObject({ x: 600, y: 700 })
    expect(await db.decorations.get(['scene-2', sceneTwoItem.id])).toMatchObject({ x: 650, y: 720 })
    expect(await getFarmStateV3(db, context)).toMatchObject({
      activeSceneId: 'scene-2',
      acknowledgedSceneChapter: 2,
      cookingMeal: { phase: 'raw' },
    })
    db.close()
  })
})

describe('cosmetic ownership, loadout and v3 backup', () => {
  it('keeps permanent ownership separate from free, validated global equipment', async () => {
    const db = freshDb()
    await seedEggs(db, 100)
    const uc = createFarmUsecases(db, internalSources)
    const accessory = INTERNAL_SCENE_1_COSMETIC_DRAFTS.find(item => item.slot === 'accessory')!
    const outfit = INTERNAL_SCENE_1_COSMETIC_DRAFTS.find(item => item.slot === 'outfit')!

    expect(await uc.buyCosmetic(accessory.id, now)).toEqual({ status: 'purchased', chargedEggs: 10 })
    expect(await uc.buyCosmetic(accessory.id, now + 1)).toEqual({ status: 'already-owned', chargedEggs: 0 })
    expect(await uc.buyCosmetic(outfit.id, now + 2)).toEqual({ status: 'purchased', chargedEggs: 20 })
    expect(await uc.equipCosmetic('mother', 'headwear', accessory.id, now + 3))
      .toEqual({ status: 'target-mismatch', chargedEggs: 0 })
    expect(await uc.equipCosmetic('xiaopi', 'accessory', outfit.id, now + 4))
      .toEqual({ status: 'slot-mismatch', chargedEggs: 0 })
    expect(await uc.equipCosmetic('xiaopi', 'accessory', accessory.id, now + 5))
      .toEqual({ status: 'equipped', chargedEggs: 0 })

    let vm = await uc.loadViewModel(now + 5)
    expect(vm.ownedCosmeticIds.sort()).toEqual([accessory.id, outfit.id].sort())
    expect(vm.loadout.xiaopi.accessory).toBe(accessory.id)
    expect(vm.eggStock).toBe(70)
    expect(await uc.unequipCosmetic('xiaopi', 'accessory')).toEqual({ status: 'unequipped', chargedEggs: 0 })
    vm = await uc.loadViewModel(now + 6)
    expect(vm.ownedCosmeticIds).toContain(accessory.id)
    expect(vm.loadout.xiaopi.accessory).toBeNull()
    expect(vm.eggStock).toBe(70)
    db.close()
  })

  it('restores decoration ownership, coordinates, cosmetic ownership and loadout', async () => {
    const source = freshDb()
    await seedEggs(source, 100)
    const uc = createFarmUsecases(source, internalSources)
    const decoration = FARM_SCENE_DEFINITIONS[0].decorationCatalog[2]
    const headwear = INTERNAL_SCENE_1_COSMETIC_DRAFTS.find(item => item.slot === 'headwear')!
    await uc.buyDecoration('scene-1', decoration.id, now)
    await uc.placeDecoration('scene-1', decoration.id, { x: 600, y: 650 }, now)
    await uc.buyCosmetic(headwear.id, now)
    await uc.equipCosmetic('mother', 'headwear', headwear.id, now)

    const restored = freshDb()
    await importAll(restored, await exportAll(source))
    expect(await restored.decorations.toArray()).toEqual(await source.decorations.toArray())
    expect(await restored.cosmetics.toArray()).toEqual(await source.cosmetics.toArray())
    expect((await restored.kv.get('loadout'))?.value).toEqual((await source.kv.get('loadout'))?.value)
    source.close()
    restored.close()
  })
})
