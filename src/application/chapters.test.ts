import { describe, expect, it } from 'vitest'
import {
  FARM_SCENE_DEFINITIONS,
  FUTURE_FARM_SCENE_DRAFTS,
  type FarmSceneDefinition,
} from '../domain/farmScenes'
import { defaultMeta, getFarmStateV3, PipiDB, setFarmStateV3, setKV } from './db'
import { defaultFarmStateV3, persistedChickWithDefaults } from './farmPersistence'
import { createFarmUsecases } from './usecases/farmHome'
import { HATCH_MS } from '../domain/types'

let dbSequence = 0
const freshDb = () => new PipiDB(`pipitest-chapters-${Date.now()}-${dbSequence++}`)
const now = new Date('2026-07-19T09:00:00+08:00').getTime()
const context = { now, today: '2026-07-19' }

async function seedProgress(db: PipiDB, totalDays: number, farm = defaultFarmStateV3()) {
  await setKV(db, 'meta', { ...defaultMeta(context.today), totalDays })
  await setFarmStateV3(db, { ...farm, henName: '咕咕' })
}

function sceneThree(): FarmSceneDefinition {
  const base = FUTURE_FARM_SCENE_DRAFTS[0]
  return {
    ...base,
    id: 'scene-3',
    chapter: 3,
    title: '溪谷果园',
    subtitle: '第 72 个完成日后的新旅程',
    unlockAtTotalDays: 72,
    freeSignAssetId: 'internal-placeholder:scene-3-travel-sign',
    decorationCatalog: base.decorationCatalog.map(item => ({
      ...item,
      id: item.id.replace('scene-2', 'scene-3'),
      sceneId: 'scene-3',
    })),
    chickVariantIds: {
      normal: ['chick-normal-default-f4'],
      color: ['chick-color-scene-3-a', 'chick-color-scene-3-b'],
      special: ['chick-special-scene-3-a'],
    },
    cosmeticItemIds: ['xiaopi-outfit-scene-3-core'],
  }
}

describe('框架 6 · 章节资格、庆祝与顺序旅行', () => {
  it.each([
    [35, 1, null],
    [36, 2, 2],
    [71, 2, 2],
    [72, 3, 2], // 本地只有场景 1/2，资格 3 也不会产生空白场景 3
  ] as const)('totalDays=%i 的 eligible=%i，当前包待庆祝=%s', async (totalDays, eligible, _celebration) => {
    const db = freshDb()
    await seedProgress(db, totalDays)
    const vm = await createFarmUsecases(db).loadViewModel(now)
    expect(vm.eligibleChapter).toBe(eligible)
    expect(vm.availableChapter).toBe(1)
    expect(vm.enterableChapter).toBe(1)
    expect(vm.pendingCelebrationScene).toBeNull()
    expect(vm.nextTravelScene).toBeNull()
    expect(vm.sceneMap.map(scene => scene.id)).toEqual(['scene-1'])
    db.close()
  })

  it('再住一阵子只确认庆祝并允许无限停留；旅行始终 activeChapter+1', async () => {
    const db = freshDb()
    const definitions = [...FARM_SCENE_DEFINITIONS, ...FUTURE_FARM_SCENE_DRAFTS, sceneThree()]
    await seedProgress(db, 72)
    const uc = createFarmUsecases(db, { sceneDefinitions: definitions })

    expect((await uc.loadViewModel(now)).pendingCelebrationScene?.chapter).toBe(2)
    expect(await uc.acknowledgeChapter(3, now)).toBe(false)
    expect(await uc.acknowledgeChapter(2, now)).toBe(true)
    expect((await uc.loadViewModel(now)).pendingCelebrationScene?.chapter).toBe(3)
    expect((await getFarmStateV3(db, context)).activeSceneId).toBe('scene-1')

    expect(await uc.acknowledgeChapter(3, now)).toBe(true)
    expect((await uc.loadViewModel(now)).pendingCelebrationScene).toBeNull()
    expect((await uc.loadViewModel(now)).pendingTravelChapters).toEqual([2, 3])
    expect((await getFarmStateV3(db, context)).activeSceneId).toBe('scene-1')

    expect(await uc.travelToNextScene('scene-1', 'refund', now)).toMatchObject({
      status: 'travelled', farm: { activeSceneId: 'scene-2' },
    })
    expect((await uc.loadViewModel(now)).pendingTravelChapters).toEqual([3])
    expect(await uc.travelToNextScene('scene-2', 'refund', now)).toMatchObject({
      status: 'travelled', farm: { activeSceneId: 'scene-3' },
    })
    expect((await uc.loadViewModel(now)).pendingTravelChapters).toEqual([])
    db.close()
  })

  it('核心包脱期时静默等待、完成日与 acknowledged 不越界；更新后从第 2 章补放', async () => {
    const db = freshDb()
    await seedProgress(db, 72)
    const oldPackage = createFarmUsecases(db, { sceneDefinitions: [FARM_SCENE_DEFINITIONS[0]] })
    const delayed = await oldPackage.loadViewModel(now)
    expect(delayed).toMatchObject({
      eligibleChapter: 3,
      availableChapter: 1,
      enterableChapter: 1,
      acknowledgedSceneChapter: 1,
      pendingCelebrationScene: null,
      nextTravelScene: null,
    })
    expect((await getFarmStateV3(db, context)).acknowledgedSceneChapter).toBe(1)
    expect((await defaultMeta(context.today)).totalDays).toBe(0)
    expect((await (await db.kv.get('meta'))!.value as { totalDays: number }).totalDays).toBe(72)

    const updated = createFarmUsecases(db, {
      sceneDefinitions: [...FARM_SCENE_DEFINITIONS, ...FUTURE_FARM_SCENE_DRAFTS, sceneThree()],
    })
    expect((await updated.loadViewModel(now)).pendingCelebrationScene?.chapter).toBe(2)
    expect(await updated.acknowledgeChapter(2, now)).toBe(true)
    expect((await updated.loadViewModel(now)).pendingCelebrationScene?.chapter).toBe(3)
    db.close()
  })
})

describe('框架 6 · 回访、鸡舍与权限', () => {
  it('旧场景按 viewedSceneId 收集小鸡，保留鸡舍/TTS，隐藏学习/孵化/厨房', async () => {
    const db = freshDb()
    await seedProgress(db, 36, {
      ...defaultFarmStateV3(), activeSceneId: 'scene-2', acknowledgedSceneChapter: 2,
    })
    await db.chicks.bulkAdd([
      persistedChickWithDefaults({ chickId: 'old-a', bornOn: '2026-07-18', source: 'hatch', homeX: null, homeY: null }, 'scene-1', 1),
      persistedChickWithDefaults({ chickId: 'old-b', bornOn: '2026-07-18', source: 'hatch', homeX: null, homeY: null }, 'scene-1', 2),
      persistedChickWithDefaults({ chickId: 'current-a', bornOn: '2026-07-19', source: 'hatch', homeX: null, homeY: null }, 'scene-2', 3),
    ])
    await db.cards.put({ wordId: 'apple', due: now, card: { due: new Date(now), reps: 1 } as never })
    const uc = createFarmUsecases(db, {
      sceneDefinitions: [...FARM_SCENE_DEFINITIONS, ...FUTURE_FARM_SCENE_DRAFTS],
    })
    const oldScene = await uc.loadViewModel(now, 'scene-1')

    expect(oldScene).toMatchObject({
      activeSceneId: 'scene-2',
      viewedSceneId: 'scene-1',
      isViewingCurrentJourney: false,
      chicksTotal: 2,
      chicksInCoop: 0,
      sceneCapabilities: {
        learning: false, hatchery: false, kitchen: false, rescue: false,
        chickChat: true, coop: true, returnToCurrentJourney: true,
      },
    })
    expect(oldScene.chicksAll.map(chick => chick.chickId).sort()).toEqual(['old-a', 'old-b'])
    expect(oldScene.availableRecipes.every(recipe => !recipe.enabled)).toBe(true)
    expect(await uc.chickChat('old-a', [], now, 'scene-1')).toMatchObject({
      primary: { chickId: 'old-a', word: 'apple' },
    })
    expect(await uc.chickChat('current-a', [], now, 'scene-1')).toBeNull()
    expect((await getFarmStateV3(db, context)).activeSceneId).toBe('scene-2')
    db.close()
  })
})

describe('框架 6 · 场景款式池与旅行原子性', () => {
  it('scene-2 放蛋使用 scene-2 款式池；已放入的旅行蛋不重抽并归属结算时场景', async () => {
    const db = freshDb()
    await seedProgress(db, 36, { ...defaultFarmStateV3(), eggStock: 2 })
    let randomCalls = 0
    const rolls = [0.9, 0.9]
    const uc = createFarmUsecases(db, {
      sceneDefinitions: [...FARM_SCENE_DEFINITIONS, ...FUTURE_FARM_SCENE_DRAFTS],
      random: () => rolls[randomCalls++] ?? 0,
      createId: () => 'travel-hatch',
    })

    expect(await uc.allocateEggToHatch(now)).toBe(true)
    const lockedInSceneOne = (await getFarmStateV3(db, context)).incubating
    expect(lockedInSceneOne?.variantId).toBe('chick-color-approved-b')
    const callsAfterPlacement = randomCalls
    expect(await uc.travelToNextScene('scene-1', 'refund', now + 1)).toMatchObject({ status: 'travelled' })
    expect((await getFarmStateV3(db, { now: now + 1, today: context.today })).incubating).toEqual(lockedInSceneOne)
    expect(randomCalls).toBe(callsAfterPlacement)
    expect((await uc.clockGuard(now + HATCH_MS)).hatched).toBe(1)
    expect(await db.chicks.get('travel-hatch')).toMatchObject({
      sceneId: 'scene-2', variantId: 'chick-color-approved-b',
    })

    await setFarmStateV3(db, {
      ...(await getFarmStateV3(db, { now: now + HATCH_MS, today: '2026-07-20' })),
      eggStock: 1,
    })
    expect(await uc.allocateEggToHatch(now + HATCH_MS + 1)).toBe(true)
    expect((await getFarmStateV3(db, { now: now + HATCH_MS + 1, today: '2026-07-20' })).incubating?.variantId)
      .toBe('chick-color-approved-b')
    db.close()
  })

  it.each([
    ['raw', false],
    ['ready', true],
  ] as const)('%s 料理退款、清空、场景/acknowledged 推进同事务幂等且不改变鸡舍收藏', async (_phase, makeReady) => {
    const db = freshDb()
    await seedProgress(db, 36, { ...defaultFarmStateV3(), eggStock: 20 })
    await db.chicks.bulkAdd(Array.from({ length: 41 }, (_, index) => ({
      ...persistedChickWithDefaults({
        chickId: `joint-${index + 1}`, bornOn: '2026-07-19', source: 'hatch' as const,
        homeX: 100 + index, homeY: 300 + index,
      }, 'scene-1', index + 1),
      favorite: index < 8,
    })))
    const uc = createFarmUsecases(db, {
      sceneDefinitions: [...FARM_SCENE_DEFINITIONS, ...FUTURE_FARM_SCENE_DRAFTS],
    })
    expect((await uc.startMeal('celebration_feast', now)).ok).toBe(true)
    if (makeReady) expect(await uc.mealAnimationDone(now + 1)).toBe(true)
    const before = await db.chicks.toArray()
    const results = await Promise.all([
      uc.travelToNextScene('scene-1', 'refund', now + 2),
      uc.travelToNextScene('scene-1', 'refund', now + 2),
    ])
    expect(results.filter(result => result.status === 'travelled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'stale')).toHaveLength(1)
    expect(await getFarmStateV3(db, { now: now + 2, today: context.today })).toMatchObject({
      activeSceneId: 'scene-2', acknowledgedSceneChapter: 2, eggStock: 20, cookingMeal: null,
    })
    expect(await db.chicks.toArray()).toEqual(before)
    const revisited = await uc.loadViewModel(now + 2, 'scene-1')
    expect(revisited).toMatchObject({ chicksTotal: 41, chicksInCoop: 1, favoriteCount: 8 })
    db.close()
  })
})
