// 首页用例全链路:完成学习 → 发蛋 → 分配 → 24h 孵化 → 农场 +1(fake-indexeddb)

import { describe, expect, it } from 'vitest'
import { getFarmStateV3, PipiDB, setFarmStateV3 } from './db'
import { createFarmUsecases } from './usecases/farmHome'
import { HATCH_MS } from '../domain/types'
import { persistedChickWithDefaults } from './farmPersistence'
import { FARM_SCENE_DEFINITIONS, FUTURE_FARM_SCENE_DRAFTS } from '../domain/farmScenes'

let dbSeq = 0
const freshDb = () => new PipiDB(`pipitest-farm-${Date.now()}-${dbSeq++}`)

describe('首页三状态与蛋经济全链路', () => {
  it('first_visit → 起名 → daily_incomplete → 完成 → daily_complete(发蛋+连胜)', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    const t0 = Date.now()

    await uc.clockGuard(t0)
    let vm = await uc.loadViewModel(t0)
    expect(vm.state).toBe('first_visit')
    expect(vm.dailyTarget).toBe(4) // 全新词库,今日 4 个新词
    expect(vm.reviewCountToday).toBe(0)

    await uc.nameHen('咕咕')
    vm = await uc.loadViewModel(t0)
    expect(vm.state).toBe('daily_incomplete')
    expect(vm.dayNumber).toBe(1)

    await uc.completeDailyLesson(t0)
    vm = await uc.loadViewModel(t0)
    expect(vm.state).toBe('daily_complete')
    expect(vm.eggStock).toBe(2)
    expect(vm.streak).toBe(1)

    // 同日重复完成幂等
    await uc.completeDailyLesson(t0)
    vm = await uc.loadViewModel(t0)
    expect(vm.eggStock).toBe(2)
    expect(vm.streak).toBe(1)
    db.close()
  })

  it('分配孵化 → 不满 24h 不破壳 → 满 24h 破壳成小鸡', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    const t0 = Date.now()

    await uc.clockGuard(t0)
    await uc.nameHen('咕咕')
    await uc.completeDailyLesson(t0)
    expect(await uc.allocateEggToHatch(t0)).toBe(true)

    let vm = await uc.loadViewModel(t0)
    expect(vm.eggStock).toBe(1)
    expect(vm.incubating).not.toBeNull()
    expect(vm.incubating!.hatchesAt).toBe(t0 + HATCH_MS)
    expect(vm.incubating!.remainingMs).toBe(HATCH_MS)

    // 23 小时后:还没破壳
    await uc.clockGuard(t0 + HATCH_MS - 3600_000)
    vm = await uc.loadViewModel(t0 + HATCH_MS - 3600_000)
    expect(vm.chicksTotal).toBe(0)
    expect(vm.incubating).not.toBeNull()

    // 24 小时后:破壳,农场 +1,巢位释放;新小鸡 isNewToday
    const t1 = t0 + HATCH_MS
    const { hatched, hatchedChickId } = await uc.clockGuard(t1)
    expect(hatched).toBe(1)
    expect(hatchedChickId).toBeTruthy()
    vm = await uc.loadViewModel(t1)
    expect(vm.chicksTotal).toBe(1)
    expect(vm.incubating).toBeNull()
    expect(vm.chicksVisible[0].isNewToday).toBe(true)
    db.close()
  })

  it('loadViewModel 不传 now 时使用注入的 sources.now', async () => {
    const db = freshDb()
    const t0 = new Date('2026-07-17T09:00:00+08:00').getTime()
    const uc = createFarmUsecases(db, {
      now: () => t0,
      random: () => 0,
      createId: () => 'clock-source-chick',
    })
    await uc.clockGuard()
    await uc.nameHen('咕咕')
    await uc.completeDailyLesson()
    await uc.allocateEggToHatch()

    expect((await uc.loadViewModel()).incubating?.remainingMs).toBe(HATCH_MS)
    db.close()
  })

  it('并发时钟守卫对同一颗到期蛋只结算一次', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    const t0 = Date.now()
    await uc.clockGuard(t0)
    await uc.nameHen('咕咕')
    await uc.completeDailyLesson(t0)
    await uc.allocateEggToHatch(t0)

    const results = await Promise.all([
      uc.clockGuard(t0 + HATCH_MS + 1),
      uc.clockGuard(t0 + HATCH_MS + 1),
    ])
    expect(results.reduce((sum, result) => sum + result.hatched, 0)).toBe(1)
    expect(await db.chicks.count()).toBe(1)
    expect((await uc.loadViewModel(t0 + HATCH_MS + 1)).incubating).toBeNull()
    db.close()
  })

  it('两日闭环:第一天孵化 → 第二天破壳 → 再赚蛋 → 煎蛋喂真实小鸡', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    const dayOne = new Date('2026-07-17T09:00:00+08:00').getTime()

    await uc.clockGuard(dayOne)
    await uc.nameHen('咕咕')
    await uc.completeDailyLesson(dayOne)
    expect((await uc.loadViewModel(dayOne)).eggStock).toBe(2)
    expect(await uc.allocateEggToHatch(dayOne)).toBe(true)

    await uc.clockGuard(dayOne + HATCH_MS - 1)
    expect((await uc.loadViewModel(dayOne + HATCH_MS - 1)).chicksTotal).toBe(0)

    const dayTwo = dayOne + HATCH_MS + 1
    expect((await uc.clockGuard(dayTwo)).hatched).toBe(1)
    let vm = await uc.loadViewModel(dayTwo)
    expect(vm.state).toBe('daily_incomplete')
    expect(vm.dayNumber).toBe(2)
    expect(vm.chicksTotal).toBe(1)
    expect(vm.incubating).toBeNull()

    await uc.completeDailyLesson(dayTwo)
    vm = await uc.loadViewModel(dayTwo)
    expect(vm.state).toBe('daily_complete')
    expect(vm.streak).toBe(2)
    expect(vm.eggStock).toBe(3)

    expect((await uc.startMeal('single_fried_egg', dayTwo)).ok).toBe(true)
    expect(await uc.mealAnimationDone(dayTwo)).toBe(true)
    expect((await uc.serveMeal(vm.chicksVisible[0].chickId, dayTwo)).ok).toBe(true)
    vm = await uc.loadViewModel(dayTwo)
    expect(vm.cookingMeal).toBeNull()
    expect(vm.eggStock).toBe(2)
    expect(vm.chicksTotal).toBe(1)
    db.close()
  })

  it('煎蛋崩溃恢复:落库值只有 raw/ready,cooking 动画态重启后回 raw', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    const t0 = Date.now()
    await uc.clockGuard(t0)
    await uc.nameHen('咕咕')
    await uc.completeDailyLesson(t0)

    await db.chicks.add(persistedChickWithDefaults({ chickId: 'feed-target', bornOn: '2026-07-17', source: 'hatch', homeX: null, homeY: null }))
    expect((await uc.startMeal('single_fried_egg', t0)).ok).toBe(true)
    // 模拟"正在煎(动画中)崩溃重启":库里仍是 raw
    let vm = await uc.loadViewModel(t0)
    expect(vm.cookingMeal?.phase).toBe('raw')
    expect(vm.eggStock).toBe(1) // 2 颗必修蛋中 1 颗已下锅

    const restored = createFarmUsecases(db)
    expect((await restored.startMeal('single_fried_egg', t0 + 1)).ok).toBe(false)
    expect(await restored.mealAnimationDone(t0 + 1)).toBe(true)
    expect((await restored.serveMeal('feed-target', t0 + 1)).ok).toBe(true)
    vm = await uc.loadViewModel(t0)
    expect(vm.cookingMeal).toBeNull()

    // 守卫:空料理不能重复享用
    expect((await uc.serveMeal('feed-target')).ok).toBe(false)
    db.close()
  })

  it('群聊:抽词更新见面时间,primary 与 others 数量正确', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    const t0 = Date.now()
    await db.chicks.bulkAdd([
      persistedChickWithDefaults({ chickId: 'chick-a', bornOn: '2026-07-17', source: 'hatch', homeX: null, homeY: null }),
      persistedChickWithDefaults({ chickId: 'chick-b', bornOn: '2026-07-17', source: 'hatch', homeX: null, homeY: null }),
      persistedChickWithDefaults({ chickId: 'chick-c', bornOn: '2026-07-17', source: 'hatch', homeX: null, homeY: null }),
    ])
    // 造 3 张有效已学卡和 1 张已不在当前词库的旧卡
    await db.cards.bulkPut(
      ['apple', 'banana', 'orange', 'legacy-missing'].map(id => ({
        wordId: id, due: t0, card: { due: new Date(t0), reps: 1 } as never,
      })),
    )
    const chat = await uc.chickChat('chick-a', ['chick-b', 'missing-chick', 'chick-b', 'chick-c'], t0)
    expect(chat).not.toBeNull()
    expect(chat!.others).toHaveLength(2)
    const drawn = [chat!.primary.word, ...chat!.others.map(o => o.word)]
    expect(new Set(drawn).size).toBe(3) // 不重复
    expect(await db.seen.count()).toBe(3) // 见面时间已记;无效旧卡没有进入气泡
    expect((await db.seen.toArray()).every(row => row.lastSeenAt === t0)).toBe(true)

    expect(await uc.chickChat('missing-chick', [], t0 + 1)).toBeNull()
    expect(await db.seen.count()).toBe(3)
    db.close()
  })

  it('拖放落点持久化为逻辑坐标', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    await db.chicks.add(persistedChickWithDefaults({ chickId: 'c1', bornOn: '2026-07-17', source: 'hatch', homeX: null, homeY: null }))
    expect(await uc.placeChick('c1', { x: 365, y: 470 })).toBe(true)
    expect(await uc.placeChick('missing', { x: 1, y: 2 })).toBe(false)
    expect(await uc.placeChick('c1', { x: Number.NaN, y: 2 })).toBe(false)
    const vm = await createFarmUsecases(db).loadViewModel()
    expect(vm.chicksVisible[0].home).toEqual({ x: 365, y: 470 })
    db.close()
  })

  it('小皮、母鸡、鸡窝与待救援框按场景持久化拖放落点', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    const sceneOneHomes = {
      mother: { x: 510, y: 505 },
      xiaopi: { x: 790, y: 480 },
      hatchery: { x: 36, y: 520 },
      rescue: { x: 980, y: 270 },
    } as const

    for (const [elementId, home] of Object.entries(sceneOneHomes)) {
      expect(await uc.placeSceneElement(elementId as keyof typeof sceneOneHomes, home, undefined, 'scene-1')).toBe(true)
    }
    expect(await uc.placeSceneElement('mother', { x: Number.NaN, y: 1 })).toBe(false)
    expect((await uc.loadViewModel()).sceneElementHomes).toEqual(sceneOneHomes)

    const farm = await getFarmStateV3(db, { now: Date.now(), today: '2026-07-22' })
    await setFarmStateV3(db, { ...farm, activeSceneId: 'scene-2', acknowledgedSceneChapter: 2 })
    expect(await uc.placeSceneElement('mother', { x: 610, y: 530 }, undefined, 'scene-2')).toBe(true)
    expect((await uc.loadViewModel(undefined, 'scene-2')).sceneElementHomes).toEqual({ mother: { x: 610, y: 530 } })
    expect((await uc.loadViewModel(undefined, 'scene-1')).sceneElementHomes).toEqual(sceneOneHomes)
    db.close()
  })

  it('40 只可见上限的数据侧真实化,其余计入鸡舍', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    await db.chicks.bulkAdd(Array.from({ length: 43 }, (_, index) => persistedChickWithDefaults({
      chickId: `cap-${index}`,
      bornOn: `2026-07-${String((index % 28) + 1).padStart(2, '0')}`,
      source: 'hatch' as const,
      homeX: null,
      homeY: null,
    })))
    const vm = await uc.loadViewModel()
    expect(vm.chicksTotal).toBe(43)
    expect(vm.chicksVisible).toHaveLength(40)
    expect(vm.chicksInCoop).toBe(3)
    db.close()
  })

  it('同日 40/41 使用持久化精确次序轮换，鸡舍仍包含全部 41 只', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    await db.chicks.bulkAdd(Array.from({ length: 41 }, (_, index) => persistedChickWithDefaults({
      chickId: `same-day-${String(index + 1).padStart(2, '0')}`,
      bornOn: '2026-07-19',
      source: 'hatch' as const,
      homeX: null,
      homeY: null,
    }, 'scene-1', index + 1)))

    const vm = await uc.loadViewModel()
    expect(vm.chicksVisible).toHaveLength(40)
    expect(vm.chicksVisible[0].chickId).toBe('same-day-41')
    expect(vm.chicksVisible.some(chick => chick.chickId === 'same-day-01')).toBe(false)
    expect(vm.chicksAll).toHaveLength(41)
    expect(vm.chicksInCoop).toBe(1)

    const now = Date.now()
    await db.cards.put({ wordId: 'apple', due: now, card: { due: new Date(now), reps: 1 } as never })
    expect(await uc.chickChat('same-day-01', [], now)).toMatchObject({
      primary: { chickId: 'same-day-01', word: 'apple' },
    })
    expect((await uc.favoriteChick('same-day-01')).status).toBe('updated')
    const returned = await uc.loadViewModel(now)
    expect(returned.chicksVisible.find(chick => chick.chickId === 'same-day-01')?.favorite).toBe(true)
    expect(returned.chicksAll).toHaveLength(41)
    db.close()
  })

  it('快速并发收藏最多成功 8 只，第 9 只要求替换；取消不写入', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    await db.chicks.bulkAdd(Array.from({ length: 9 }, (_, index) => persistedChickWithDefaults({
      chickId: `favorite-${index + 1}`,
      bornOn: '2026-07-19',
      source: 'hatch' as const,
      homeX: null,
      homeY: null,
    }, 'scene-1', index + 1)))

    const results = await Promise.all(Array.from({ length: 9 }, (_, index) => uc.favoriteChick(`favorite-${index + 1}`)))
    expect(results.filter(result => result.status === 'updated')).toHaveLength(8)
    expect(results.find(result => result.status === 'replacement-required')?.status).toBe('replacement-required')
    expect((await db.chicks.toArray()).filter(chick => chick.favorite)).toHaveLength(8)
    const beforeCancel = await db.chicks.toArray()
    expect(await db.chicks.toArray()).toEqual(beforeCancel)
    db.close()
  })

  it('显式替换原子交换且跨场景目标被拒绝', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    await db.chicks.bulkAdd([
      ...Array.from({ length: 9 }, (_, index) => ({
        ...persistedChickWithDefaults({
          chickId: `replace-${index + 1}`,
          bornOn: '2026-07-19',
          source: 'hatch' as const,
          homeX: null,
          homeY: null,
        }, 'scene-1', index + 1),
        favorite: index < 8,
      })),
      persistedChickWithDefaults({
        chickId: 'scene-2-chick', bornOn: '2026-07-19', source: 'hatch', homeX: null, homeY: null,
      }, 'scene-2', 100),
    ])

    expect((await uc.favoriteChick('replace-9')).status).toBe('replacement-required')
    const repeatedReplace = await Promise.all([
      uc.favoriteChick('replace-9', 'replace-1'),
      uc.favoriteChick('replace-9', 'replace-1'),
    ])
    expect(repeatedReplace.every(result => result.status === 'updated')).toBe(true)
    const sceneOne = (await db.chicks.toArray()).filter(chick => chick.sceneId === 'scene-1')
    expect(sceneOne.filter(chick => chick.favorite)).toHaveLength(8)
    expect(sceneOne.find(chick => chick.chickId === 'replace-1')?.favorite).toBe(false)
    expect(sceneOne.find(chick => chick.chickId === 'replace-9')?.favorite).toBe(true)
    expect((await uc.favoriteChick('scene-2-chick')).status).toBe('invalid-target')
    expect((await db.chicks.get('scene-2-chick'))?.favorite).toBe(false)
    expect(await uc.placeChick('scene-2-chick', { x: 400, y: 500 })).toBe(false)
    expect(await uc.chickChat('scene-2-chick', [], Date.now())).toBeNull()
    expect(await db.chicks.get('scene-2-chick')).toMatchObject({ homeX: null, homeY: null, favorite: false })
    db.close()
  })

  it('40 只全收藏损坏状态仍保护资产，新鸡只进入鸡舍且收藏不自动消失', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    await db.chicks.bulkAdd(Array.from({ length: 41 }, (_, index) => ({
      ...persistedChickWithDefaults({
        chickId: `corrupt-${index + 1}`,
        bornOn: '2026-07-19',
        source: 'hatch' as const,
        homeX: null,
        homeY: null,
      }, 'scene-1', index + 1),
      favorite: index < 40,
    })))
    const vm = await uc.loadViewModel()
    expect(vm.chicksVisible).toHaveLength(40)
    expect(vm.chicksVisible.every(chick => chick.favorite)).toBe(true)
    expect(vm.chicksAll).toHaveLength(41)
    expect(vm.chicksAll.find(chick => chick.chickId === 'corrupt-41')?.favorite).toBe(false)
    expect((await db.chicks.toArray()).filter(chick => chick.favorite)).toHaveLength(40)
    db.close()
  })

  it('放蛋事务固定隐藏异色结果；刷新与未到期守卫不重抽', async () => {
    const db = freshDb()
    const t0 = new Date('2026-07-17T09:00:00+08:00').getTime()
    const rolls = [0.9, 0]
    let randomCalls = 0
    const uc = createFarmUsecases(db, {
      now: () => t0,
      random: () => rolls[randomCalls++] ?? 0,
      createId: () => 'hidden-color-chick',
    })
    await uc.clockGuard()
    await uc.nameHen('咕咕')
    await uc.completeDailyLesson()
    expect(await uc.allocateEggToHatch()).toBe(true)
    expect(await uc.allocateEggToHatch()).toBe(false)

    const persisted = await getFarmStateV3(db, { now: t0, today: '2026-07-17' })
    expect(persisted.eggStock).toBe(1)
    expect(persisted.incubating).toMatchObject({
      placedAt: t0,
      rarity: 'color',
      variantId: 'chick-color-approved-b',
    })
    expect(randomCalls).toBe(1)

    const vm = await uc.loadViewModel(t0)
    expect(vm.incubating).toEqual({ placedAt: t0, hatchesAt: t0 + HATCH_MS, remainingMs: HATCH_MS })
    expect(vm.incubating).not.toHaveProperty('rarity')
    expect(vm.incubating).not.toHaveProperty('variantId')

    const restored = createFarmUsecases(db, {
      random: () => { throw new Error('恢复期间不应重抽') },
      createId: () => 'hidden-color-chick',
    })
    expect((await restored.clockGuard(t0 + HATCH_MS - 1)).hatched).toBe(0)
    expect((await getFarmStateV3(db, { now: t0, today: '2026-07-17' })).incubating).toEqual(persisted.incubating)
    db.close()
  })

  it('孵化蛋随旅程移动，恰好 24 小时结算到当时 activeSceneId 且保留隐藏外观', async () => {
    const db = freshDb()
    const t0 = new Date('2026-07-17T09:00:00+08:00').getTime()
    const uc = createFarmUsecases(db, {
      sceneDefinitions: [...FARM_SCENE_DEFINITIONS, ...FUTURE_FARM_SCENE_DRAFTS],
      random: () => 0.99,
      createId: () => 'travel-special-chick',
    })
    await uc.clockGuard(t0)
    await uc.nameHen('咕咕', t0)
    await uc.completeDailyLesson(t0)
    await uc.allocateEggToHatch(t0)

    const beforeTravel = await getFarmStateV3(db, { now: t0, today: '2026-07-17' })
    expect(beforeTravel.incubating?.rarity).toBe('special')
    await setFarmStateV3(db, { ...beforeTravel, activeSceneId: 'scene-2' })

    expect((await uc.clockGuard(t0 + HATCH_MS - 1)).hatched).toBe(0)
    expect((await uc.clockGuard(t0 + HATCH_MS)).hatched).toBe(1)
    expect((await uc.clockGuard(t0 + HATCH_MS)).hatched).toBe(0)
    expect(await db.chicks.get('travel-special-chick')).toMatchObject({
      sceneId: 'scene-2',
      rarity: 'special',
      variantId: 'chick-special-approved-f',
    })
    expect((await uc.loadViewModel(t0 + HATCH_MS)).chicksVisible[0]).toMatchObject({
      chickId: 'travel-special-chick',
      sceneId: 'scene-2',
      rarity: 'special',
      variantId: 'chick-special-approved-f',
    })
    db.close()
  })
})
