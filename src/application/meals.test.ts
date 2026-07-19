import { describe, expect, it } from 'vitest'
import type { RecipeId } from '../domain/meals'
import { getFarmStateV3, PipiDB, setFarmStateV3 } from './db'
import { defaultFarmStateV3, persistedChickWithDefaults } from './farmPersistence'
import { createFarmUsecases } from './usecases/farmHome'

let dbSequence = 0
const freshDb = () => new PipiDB(`pipitest-meals-${Date.now()}-${dbSequence++}`)
const context = (now: number) => ({ now, today: '2026-07-19' })

async function seedFarm(db: PipiDB, eggStock: number, activeSceneId = 'scene-1') {
  await setFarmStateV3(db, { ...defaultFarmStateV3(), henName: '咕咕', eggStock, activeSceneId })
}

async function addChick(db: PipiDB, chickId: string, sceneId = 'scene-1') {
  await db.chicks.add({
    ...persistedChickWithDefaults({ chickId, bornOn: '2026-07-19', source: 'hatch', homeX: null, homeY: null }),
    sceneId,
  })
}

describe('CookingMeal 应用用例', () => {
  it.each([
    ['single_fried_egg', 1],
    ['picnic_platter', 5],
    ['celebration_feast', 20],
  ] as const)('%s 在库存恰好为 %i 时同事务扣清并落 raw', async (recipeId, eggCost) => {
    const db = freshDb()
    const now = 1_000
    await seedFarm(db, eggCost)
    await addChick(db, 'scene-1-chick')
    const result = await createFarmUsecases(db).startMeal(recipeId, now)
    expect(result.ok).toBe(true)
    expect(await getFarmStateV3(db, context(now))).toMatchObject({
      eggStock: 0,
      cookingMeal: { recipeId, eggCost, phase: 'raw', startedAt: now },
    })
    db.close()
  })

  it('无鸡、余额不足、已有料理均拒绝且库存原样保留', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    await seedFarm(db, 20)

    expect(await uc.startMeal('single_fried_egg', 1)).toMatchObject({ ok: false, reason: 'no-chicks' })
    expect((await getFarmStateV3(db, context(1))).eggStock).toBe(20)

    await addChick(db, 'chick-a')
    await seedFarm(db, 4)
    expect(await uc.startMeal('picnic_platter', 2)).toMatchObject({ ok: false, reason: 'insufficient-eggs' })
    expect((await getFarmStateV3(db, context(2))).eggStock).toBe(4)

    await seedFarm(db, 6)
    expect((await uc.startMeal('picnic_platter', 3)).ok).toBe(true)
    expect(await uc.startMeal('single_fried_egg', 4)).toMatchObject({ ok: false, reason: 'meal-in-progress' })
    expect((await getFarmStateV3(db, context(4))).eggStock).toBe(1)
    db.close()
  })

  it('raw/ready 崩溃恢复不重扣，动画与享用快速重复只成功一次', async () => {
    const db = freshDb()
    await seedFarm(db, 5)
    await addChick(db, 'chick-a')
    const beforeCrash = createFarmUsecases(db)
    expect((await beforeCrash.startMeal('picnic_platter', 10)).ok).toBe(true)

    const restored = createFarmUsecases(db)
    expect(await restored.startMeal('single_fried_egg', 11)).toMatchObject({ ok: false, reason: 'meal-in-progress' })
    expect((await getFarmStateV3(db, context(11))).eggStock).toBe(0)
    expect(await restored.mealAnimationDone(12)).toBe(true)
    expect(await restored.mealAnimationDone(13)).toBe(false)
    expect((await getFarmStateV3(db, context(13))).cookingMeal?.phase).toBe('ready')

    const [first, repeated] = await Promise.all([restored.serveMeal(undefined, 14), restored.serveMeal(undefined, 14)])
    expect([first.ok, repeated.ok].filter(Boolean)).toHaveLength(1)
    expect((await getFarmStateV3(db, context(14))).cookingMeal).toBeNull()
    db.close()
  })

  it('单份只接受当前场景的显式小鸡；群体料理绑定当前场景', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    await seedFarm(db, 6)
    await addChick(db, 'current-chick', 'scene-1')
    await addChick(db, 'other-chick', 'scene-2')

    await uc.startMeal('single_fried_egg', 20)
    await uc.mealAnimationDone(21)
    expect(await uc.serveMeal(undefined, 22)).toEqual({ ok: false, reason: 'invalid-chick' })
    expect(await uc.serveMeal('other-chick', 22)).toEqual({ ok: false, reason: 'invalid-chick' })
    expect((await getFarmStateV3(db, context(22))).cookingMeal).not.toBeNull()
    expect(await uc.serveMeal('current-chick', 23)).toMatchObject({
      ok: true,
      recipeId: 'single_fried_egg',
      sceneId: 'scene-1',
      chickId: 'current-chick',
    })

    await uc.startMeal('picnic_platter', 24)
    await uc.mealAnimationDone(25)
    expect(await uc.serveMeal(undefined, 26)).toMatchObject({
      ok: true,
      recipeId: 'picnic_platter',
      sceneId: 'scene-1',
    })
    db.close()
  })

  it('本章首次庆典永久写一张合照，重复庆典只享用不重复写数据', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    await seedFarm(db, 40)
    await addChick(db, 'chick-a')

    await uc.startMeal('celebration_feast', 100)
    await uc.mealAnimationDone(101)
    expect(await uc.serveMeal(undefined, 102)).toMatchObject({ ok: true, celebrationPhotoCreated: true })
    expect(await db.sceneMemory.get('scene-1')).toEqual({ sceneId: 'scene-1', celebrationPhotoCreatedAt: 102 })

    await uc.startMeal('celebration_feast', 200)
    await uc.mealAnimationDone(201)
    expect(await uc.serveMeal(undefined, 202)).toMatchObject({ ok: true, celebrationPhotoCreated: false })
    expect(await db.sceneMemory.toArray()).toEqual([{ sceneId: 'scene-1', celebrationPhotoCreatedAt: 102 }])
    db.close()
  })
})

describe('旅行料理拦截接口', () => {
  async function preparedMeal(recipeId: RecipeId = 'picnic_platter') {
    const db = freshDb()
    const cost = recipeId === 'single_fried_egg' ? 1 : recipeId === 'picnic_platter' ? 5 : 20
    await seedFarm(db, cost)
    await addChick(db, 'chick-a')
    const uc = createFarmUsecases(db)
    await uc.startMeal(recipeId, 300)
    return { db, uc, cost }
  }

  it('“先去享用”取消旅行，raw/ready 与库存完全不变', async () => {
    for (const ready of [false, true]) {
      const { db, uc } = await preparedMeal()
      if (ready) await uc.mealAnimationDone(301)
      const before = await getFarmStateV3(db, context(301))
      const advance = () => { throw new Error('取消旅行时不得调用推进函数') }
      expect(await uc.resolveMealBeforeTravel({
        expectedActiveSceneId: 'scene-1', choice: 'serve_first', advance,
      }, 302)).toMatchObject({ status: 'serve-first', meal: { phase: ready ? 'ready' : 'raw' } })
      expect(await getFarmStateV3(db, context(302))).toEqual(before)
      db.close()
    }
  })

  it('“收好再出发”在同一事务退款、清空并调用推进；并发重复仅一次成功', async () => {
    const { db, uc, cost } = await preparedMeal('celebration_feast')
    await uc.mealAnimationDone(310)
    const options = {
      expectedActiveSceneId: 'scene-1',
      choice: 'refund' as const,
      advance: (farm: Awaited<ReturnType<typeof getFarmStateV3>>) => ({ ...farm, activeSceneId: 'scene-2' }),
    }
    const results = await Promise.all([
      uc.resolveMealBeforeTravel(options, 311),
      uc.resolveMealBeforeTravel(options, 311),
    ])
    expect(results.filter(result => result.status === 'travelled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'stale')).toHaveLength(1)
    expect(results.find(result => result.status === 'travelled')).toMatchObject({ refundedEggs: cost })
    expect(await getFarmStateV3(db, context(311))).toMatchObject({
      activeSceneId: 'scene-2', eggStock: cost, cookingMeal: null,
    })
    db.close()
  })

  it('没有可旅行章节时不提前退款或清空，避免退款与旅行分叉', async () => {
    const { db, uc } = await preparedMeal()
    const before = await getFarmStateV3(db, context(320))
    expect(await uc.resolveMealBeforeTravel({
      expectedActiveSceneId: 'scene-1', choice: 'refund', advance: () => null,
    }, 321)).toEqual({ status: 'travel-unavailable' })
    expect(await getFarmStateV3(db, context(321))).toEqual(before)
    db.close()
  })
})

describe('框架 4 + 5 收藏鸡舍与料理联合不变量', () => {
  it('三档料理及旅行退款不改变 favorite、hatchedAt、home、sceneId 或场景鸡总数', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    await seedFarm(db, 66)
    await db.chicks.bulkAdd(Array.from({ length: 41 }, (_, index) => ({
      ...persistedChickWithDefaults({
        chickId: `joint-${String(index + 1).padStart(2, '0')}`,
        bornOn: '2026-07-19',
        source: 'hatch' as const,
        homeX: 100 + index,
        homeY: 300 + index,
      }, 'scene-1', 10_000 + index),
      favorite: index < 8,
    })))

    const immutableChickState = async () => (await db.chicks.where('sceneId').equals('scene-1').toArray())
      .sort((left, right) => left.chickId.localeCompare(right.chickId))
      .map(({ chickId, sceneId, favorite, hatchedAt, homeX, homeY }) => ({
        chickId, sceneId, favorite, hatchedAt, homeX, homeY,
      }))
    const before = await immutableChickState()
    const beforeVm = await uc.loadViewModel(20_000)
    expect(beforeVm).toMatchObject({ chicksTotal: 41, chicksInCoop: 1, favoriteCount: 8 })

    for (const recipeId of ['single_fried_egg', 'picnic_platter', 'celebration_feast'] as const) {
      expect((await uc.startMeal(recipeId, 20_001)).ok).toBe(true)
      expect(await uc.mealAnimationDone(20_002)).toBe(true)
      const served = recipeId === 'single_fried_egg'
        ? await uc.serveMeal('joint-01', 20_003)
        : await uc.serveMeal(undefined, 20_003)
      expect(served.ok).toBe(true)
      expect(await immutableChickState()).toEqual(before)
      expect(await uc.loadViewModel(20_004)).toMatchObject({ chicksTotal: 41, chicksInCoop: 1, favoriteCount: 8 })
    }

    expect((await uc.startMeal('celebration_feast', 20_005)).ok).toBe(true)
    const travelled = await uc.resolveMealBeforeTravel({
      expectedActiveSceneId: 'scene-1',
      choice: 'refund',
      advance: farm => ({ ...farm, activeSceneId: 'scene-2' }),
    }, 20_006)
    expect(travelled).toMatchObject({ status: 'travelled', refundedEggs: 20 })
    expect(await immutableChickState()).toEqual(before)
    expect(await db.chicks.where('sceneId').equals('scene-1').count()).toBe(41)
    expect(await db.chicks.where('sceneId').equals('scene-2').count()).toBe(0)
    db.close()
  })
})
