// F4 首页用例:状态读写与守卫,全部接受注入的 now 以便测试
// 视觉层不得直接 import 本文件之下的 db —— 一律经 useFarmHome 桥

import type { PipiDB } from '../db'
import {
  DEFAULT_SETTINGS,
  defaultMeta,
  getFarmStateV3,
  getKV,
  setFarmStateV3,
  setKV,
} from '../db'
import type { MetaState, Settings, StagePoint, DailySession } from '../../domain/types'
import * as egg from '../../domain/eggEconomy'
import { collectSceneChicks, toggleFavoriteChick } from '../../domain/chickCollection'
import {
  placeEgg,
  type HatchVariantPools,
} from '../../domain/hatchRarity'
import { isHatchDue } from '../../domain/hatchTiming'
import { completeDay } from '../../domain/streak'
import { buildPlan } from '../../domain/dailyPlan'
import { weightedSample } from '../../domain/staleness'
import { addDays, dayKeyOf } from '../../domain/time'
import { WORDS, WORD_MAP } from '../../domain/words'
import { assembleViewModel, type ChickChatVM, type FarmSnapshot } from '../viewmodel'
import { ensureStarterWords } from '../starterWords'
import {
  persistedChickHatchedAt,
  defaultCharacterLoadout,
  type FarmStateV3,
  type OwnedCosmeticRow,
  type PersistedChick,
} from '../farmPersistence'
import {
  clearReadyMeal,
  cookingDone as finishCooking,
  refundMealForTravel,
  startMeal as beginMeal,
  type CookingMeal,
  type RecipeId,
  type StartMealResult,
} from '../../domain/meals'
import {
  availableChapter,
  enterableChapter,
  nextCelebrationChapter,
  nextTravelChapter,
} from '../../domain/farmChapters'
import {
  FARM_SCENE_DEFINITIONS,
  sceneByChapter,
  sceneById,
  type DecorationCatalogItemDefinition,
  type FarmSceneDefinition,
} from '../../domain/farmScenes'
import {
  FARM_COSMETIC_DEFINITIONS,
  cosmeticById,
  type CharacterCosmeticSlot,
  type CharacterTarget,
  type CosmeticItemDefinition,
} from '../../domain/farmCosmetics'
import {
  assetIsListable,
  equipLoadoutItem,
  pointWithinPlacementBounds,
  unequipLoadoutItem,
} from '../../domain/farmCustomization'
import type { CharacterLoadout } from '../../domain/farmCatalog'

const CHAT_NEIGHBOR_CAP = 3
const CHAT_TTL_MS = 4_000

export interface FarmUsecaseSources {
  now: () => number
  random: () => number
  createId: () => string
  /** 测试/诊断可覆盖；生产默认从 active scene 的离线核心定义读取。 */
  hatchVariantPools: HatchVariantPools | null
  sceneDefinitions: readonly FarmSceneDefinition[]
  cosmeticDefinitions: readonly CosmeticItemDefinition[]
  /** 仅供显式测试/内部技术壳；生产默认 false，儿童目录不会列出候选或剪影。 */
  includeInternalPlaceholders: boolean
}

export type FavoriteChickUsecaseResult =
  | { status: 'updated' }
  | { status: 'replacement-required'; targetChickId: string; replaceableFavorites: PersistedChick[] }
  | { status: 'invalid-target' | 'invalid-replacement' }

const DEFAULT_SOURCES: FarmUsecaseSources = {
  now: () => Date.now(),
  random: () => Math.random(),
  createId: () => crypto.randomUUID(),
  hatchVariantPools: null,
  sceneDefinitions: FARM_SCENE_DEFINITIONS,
  cosmeticDefinitions: FARM_COSMETIC_DEFINITIONS,
  includeInternalPlaceholders: false,
}

export type CustomizationPurchaseResult =
  | { status: 'purchased'; chargedEggs: 5 | 10 | 15 | 20 }
  | { status: 'already-owned'; chargedEggs: 0 }
  | { status: 'insufficient-eggs' | 'item-unavailable' | 'scene-mismatch'; chargedEggs: 0 }

export type DecorationPlacementResult =
  | { status: 'placed' | 'stored'; chargedEggs: 0 }
  | { status: 'not-owned' | 'item-unavailable' | 'scene-mismatch' | 'outside-placement-bounds'; chargedEggs: 0 }

export type CosmeticEquipResult =
  | { status: 'equipped' | 'unequipped'; chargedEggs: 0 }
  | { status: 'not-owned' | 'item-unavailable' | 'target-mismatch' | 'slot-mismatch'; chargedEggs: 0 }

export type ServeMealResult =
  | {
      ok: true
      recipeId: RecipeId
      sceneId: string
      chickId?: string
      celebrationPhotoCreated: boolean
    }
  | { ok: false; reason: 'meal-not-ready' | 'invalid-chick' | 'no-chicks' }

export type TravelMealChoice = 'serve_first' | 'refund'

export type TravelMealResolution =
  | { status: 'serve-first'; meal: CookingMeal }
  | { status: 'travelled'; refundedEggs: 0 | 1 | 5 | 20; farm: FarmStateV3 }
  | { status: 'stale' | 'travel-unavailable' }

export interface ResolveMealBeforeTravelOptions {
  /** 打开旅行确认时的场景；用于拒绝快速重复点击产生的陈旧请求。 */
  expectedActiveSceneId: string
  choice: TravelMealChoice
  /** 框架 6 提供纯推进函数；返回 null 表示当前没有可进入的下一章。 */
  advance: (preparedFarm: FarmStateV3) => FarmStateV3 | null
}

export function createFarmUsecases(d: PipiDB, sourceOverrides: Partial<FarmUsecaseSources> = {}) {
  const sources = { ...DEFAULT_SOURCES, ...sourceOverrides }

  async function getFarm(now: number): Promise<FarmStateV3> {
    return getFarmStateV3(d, { now, today: dayKeyOf(now) })
  }

  async function getMeta(now: number): Promise<MetaState> {
    return getKV(d, 'meta', defaultMeta(dayKeyOf(now)))
  }

  function activeScene(farm: FarmStateV3): FarmSceneDefinition | null {
    return sceneById(farm.activeSceneId, sources.sceneDefinitions)
      ?? sources.sceneDefinitions[0]
      ?? null
  }

  function enteredScene(farm: FarmStateV3, requestedSceneId: string | undefined): FarmSceneDefinition | null {
    const active = activeScene(farm)
    if (!active) return null
    const requested = requestedSceneId ? sceneById(requestedSceneId, sources.sceneDefinitions) : active
    return requested && requested.chapter <= active.chapter ? requested : active
  }

  /** 与 enteredScene 不同：商品事务不得把无效 sceneId 静默回退到当前场景。 */
  function accessibleCatalogScene(farm: FarmStateV3, requestedSceneId: string): FarmSceneDefinition | null {
    const active = activeScene(farm)
    const requested = sceneById(requestedSceneId, sources.sceneDefinitions)
    return active && requested && requested.chapter <= active.chapter ? requested : null
  }

  function listableDecoration(
    scene: FarmSceneDefinition,
    itemId: string,
  ): DecorationCatalogItemDefinition | null {
    const item = scene.decorationCatalog.find(candidate => candidate.id === itemId)
    return item && item.sceneId === scene.id
      && assetIsListable(item.assetStatus, sources.includeInternalPlaceholders)
      ? item
      : null
  }

  function listableCosmetic(farm: FarmStateV3, itemId: string): CosmeticItemDefinition | null {
    const item = cosmeticById(itemId, sources.cosmeticDefinitions)
    if (!item || !assetIsListable(item.assetStatus, sources.includeInternalPlaceholders)) return null
    const scene = accessibleCatalogScene(farm, item.unlockSceneId)
    return scene?.cosmeticItemIds.includes(item.id) ? item : null
  }

  async function getLoadout(): Promise<CharacterLoadout> {
    return getKV(d, 'loadout', defaultCharacterLoadout())
  }

  /** 时钟守卫:起步词播种 + 孵化结算 + 今日会话保障。启动/回前台/60s 间隔调用,幂等 */
  async function clockGuard(now = sources.now()): Promise<{
    hatched: number
    hatchedChickId: string | null
    sessionRebuilt: boolean
  }> {
    await ensureStarterWords(d, now) // 一次性;必须在构建今日会话之前(起步词不进新词队列)
    let hatched = 0
    let hatchedChickId: string | null = null
    await d.transaction('rw', d.chicks, d.kv, async () => {
      const farm = await getFarm(now)
      const incubating = farm.incubating
      if (incubating && isHatchDue(incubating.placedAt, now)) {
        const bornOn = dayKeyOf(now)
        const row: PersistedChick = {
          chickId: sources.createId(),
          bornOn,
          hatchedAt: now,
          source: 'hatch',
          sceneId: farm.activeSceneId,
          rarity: incubating.rarity,
          variantId: incubating.variantId,
          favorite: false,
          homeX: null,
          homeY: null,
        }
        await d.chicks.add(row)
        await setFarmStateV3(d, { ...farm, incubating: null })
        hatched = 1
        hatchedChickId = row.chickId
      }
    })

    const today = dayKeyOf(now)
    let sessionRebuilt = false
    if (!(await d.sessions.get(today))) {
      await d.sessions.put(await buildTodaySession(today, now))
      sessionRebuilt = true
    }
    return { hatched, hatchedChickId, sessionRebuilt }
  }

  async function buildTodaySession(today: string, now: number): Promise<DailySession> {
    const due = await d.cards.where('due').belowOrEqual(now).sortBy('due')
    const known = new Set(await d.cards.toCollection().primaryKeys())
    // 近两日积压记录,供 SPEC §5.1 连续积压判定(缺记录按 0/false)
    const recentBacklogs = (await Promise.all([addDays(today, -1), addDays(today, -2)].map(k => d.sessions.get(k)))).map(
      s => ({ backlog: s?.dueBacklog ?? 0, paused: s?.newWordsPaused ?? false }),
    )
    const plan = buildPlan({
      dueByOverdue: due.map(c => c.wordId),
      unlearned: WORDS.filter(w => !known.has(w.id)).map(w => w.id),
      backlogToday: due.length,
      recentBacklogs,
    })
    return {
      date: today,
      reviewIds: plan.reviewIds,
      newIds: plan.newIds,
      dueBacklog: due.length,
      newWordsPaused: plan.newWordsPaused,
      doneCount: 0,
      answered: 0,
      correct: 0,
      completed: false,
    }
  }

  /** 完成当日必修:发蛋 + 连胜;同日幂等(以 session.completed 为准) */
  async function completeDailyLesson(now = sources.now()): Promise<void> {
    const today = dayKeyOf(now)
    await d.transaction('rw', d.sessions, d.kv, async () => {
      const session = await d.sessions.get(today)
      if (!session) return
      const farm = await getFarm(now)
      const reward = egg.completeDailyLessonWithEggs(session, farm)
      if (reward.awarded === 0) return
      await d.sessions.put(reward.session)
      await setFarmStateV3(d, reward.farm)
      await setKV(d, 'meta', completeDay(await getMeta(now), today))
    })
  }

  async function nameHen(name: string, now = sources.now()): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed) return
    const farm = await getFarm(now)
    await setFarmStateV3(d, { ...farm, henName: trimmed })
  }

  /** 单巢放蛋：扣蛋、隐藏外观、保底计数与 placedAt 在同一 Dexie 事务落库。 */
  async function allocateEggToHatch(now = sources.now()): Promise<boolean> {
    let applied = false
    await d.transaction('rw', d.chicks, d.kv, async () => {
      const farm = await getFarm(now)
      const scene = activeScene(farm)
      if (!scene) return
      const ownedVariantIds = new Set((await d.chicks.toArray()).map(chick => chick.variantId))
      const placed = placeEgg(
        {
          eggStock: farm.eggStock,
          incubating: farm.incubating,
          normalHatchStreak: farm.normalHatchStreak,
          nonSpecialHatchStreak: farm.nonSpecialHatchStreak,
        },
        sources.hatchVariantPools ?? scene.chickVariantIds,
        ownedVariantIds,
        { now: () => now, random: sources.random },
      )
      if (!placed.ok) return
      await setFarmStateV3(d, {
        ...farm,
        eggStock: placed.state.eggStock,
        incubating: placed.state.incubating,
        normalHatchStreak: placed.state.normalHatchStreak,
        nonSpecialHatchStreak: placed.state.nonSpecialHatchStreak,
      })
      applied = true
    })
    return applied
  }

  /** 三档料理统一入口：当前场景鸡数检查、扣蛋和 raw 落库处于同一事务。 */
  async function startMeal(recipeId: RecipeId, now = sources.now()): Promise<StartMealResult> {
    return d.transaction('rw', d.chicks, d.kv, async () => {
      const farm = await getFarm(now)
      const currentSceneChickCount = await d.chicks.where('sceneId').equals(farm.activeSceneId).count()
      const result = beginMeal({
        eggStock: farm.eggStock,
        currentSceneChickCount,
        cookingMeal: farm.cookingMeal,
      }, recipeId, () => now)
      if (result.ok) {
        await setFarmStateV3(d, {
          ...farm,
          eggStock: result.state.eggStock,
          cookingMeal: result.meal,
        })
      }
      return result
    })
  }

  /** 动画是瞬时态；只有 raw 能原子推进为 ready，重复回调不改变状态。 */
  async function mealAnimationDone(now = sources.now()): Promise<boolean> {
    return d.transaction('rw', d.kv, async () => {
      const farm = await getFarm(now)
      const ready = finishCooking(farm.cookingMeal)
      if (!ready) return false
      await setFarmStateV3(d, { ...farm, cookingMeal: ready })
      return true
    })
  }

  /**
   * 享用 ready 料理并清空。单份必须显式指定当前场景小鸡；群体料理始终绑定
   * 享用时的 activeSceneId。庆典首次在该场景写一条永久合照记忆。
   */
  async function serveMeal(chickId?: string, now = sources.now()): Promise<ServeMealResult> {
    return d.transaction('rw', d.chicks, d.kv, d.sceneMemory, async () => {
      const farm = await getFarm(now)
      const meal = farm.cookingMeal
      if (!clearReadyMeal(meal)) return { ok: false, reason: 'meal-not-ready' }

      if (meal.recipeId === 'single_fried_egg') {
        if (!chickId) return { ok: false, reason: 'invalid-chick' }
        const chick = await d.chicks.get(chickId)
        if (!chick || chick.sceneId !== farm.activeSceneId) {
          return { ok: false, reason: 'invalid-chick' }
        }
      } else if (await d.chicks.where('sceneId').equals(farm.activeSceneId).count() === 0) {
        return { ok: false, reason: 'no-chicks' }
      }

      let celebrationPhotoCreated = false
      if (meal.recipeId === 'celebration_feast') {
        const memory = await d.sceneMemory.get(farm.activeSceneId)
        if (!memory || memory.celebrationPhotoCreatedAt === null) {
          await d.sceneMemory.put({
            sceneId: farm.activeSceneId,
            celebrationPhotoCreatedAt: now,
          })
          celebrationPhotoCreated = true
        }
      }

      await setFarmStateV3(d, { ...farm, cookingMeal: null })
      return {
        ok: true,
        recipeId: meal.recipeId,
        sceneId: farm.activeSceneId,
        ...(chickId ? { chickId } : {}),
        celebrationPhotoCreated,
      }
    })
  }

  /**
   * 供框架 6 调用的旅行软锁边界。退款、清空和 advance 返回的场景推进在同一
   * Dexie 事务提交；expectedActiveSceneId 让同一确认按钮的快速重复点击仅成功一次。
   */
  async function resolveMealBeforeTravel(
    options: ResolveMealBeforeTravelOptions,
    now = sources.now(),
  ): Promise<TravelMealResolution> {
    return d.transaction('rw', d.kv, async () => {
      const farm = await getFarm(now)
      if (farm.activeSceneId !== options.expectedActiveSceneId) return { status: 'stale' }
      if (farm.cookingMeal && options.choice === 'serve_first') {
        return { status: 'serve-first', meal: farm.cookingMeal }
      }

      const prepared = refundMealForTravel(farm)
      const advanced = options.advance(prepared.state)
      if (!advanced || advanced.activeSceneId === options.expectedActiveSceneId) {
        return { status: 'travel-unavailable' }
      }
      await setFarmStateV3(d, advanced)
      return {
        status: 'travelled',
        refundedEggs: prepared.refundedEggs,
        farm: advanced,
      }
    })
  }

  /** “再住一阵子”只确认当前按序庆祝，不改变 activeSceneId，可无限期停留。 */
  async function acknowledgeChapter(chapter: number, now = sources.now()): Promise<boolean> {
    return d.transaction('rw', d.kv, async () => {
      const [farm, meta] = await Promise.all([getFarm(now), getMeta(now)])
      const maxEnterable = enterableChapter(meta.totalDays, availableChapter(sources.sceneDefinitions))
      const next = nextCelebrationChapter(farm.acknowledgedSceneChapter, maxEnterable)
      if (next !== chapter || !sceneByChapter(chapter, sources.sceneDefinitions)) return false
      await setFarmStateV3(d, { ...farm, acknowledgedSceneChapter: chapter })
      return true
    })
  }

  /**
   * 章节旅行编排：始终复用 resolveMealBeforeTravel，确保 raw/ready 退款、清空、
   * activeSceneId 与 acknowledged 推进处于同一事务且快速重复只成功一次。
   */
  async function travelToNextScene(
    expectedActiveSceneId: string,
    choice: TravelMealChoice = 'refund',
    now = sources.now(),
  ): Promise<TravelMealResolution> {
    const meta = await getMeta(now)
    const maxEnterable = enterableChapter(meta.totalDays, availableChapter(sources.sceneDefinitions))
    return resolveMealBeforeTravel({
      expectedActiveSceneId,
      choice,
      advance: farm => {
        const active = activeScene(farm)
        if (!active) return null
        const next = nextTravelChapter(active.chapter, maxEnterable)
        const target = next ? sceneByChapter(next, sources.sceneDefinitions) : null
        if (!target) return null
        return {
          ...farm,
          activeSceneId: target.id,
          acknowledgedSceneChapter: Math.max(farm.acknowledgedSceneChapter, target.chapter),
        }
      },
    }, now)
  }

  /** 场景贴纸所有权由 [sceneId+itemId] 唯一行表达；扣蛋与建行同事务提交。 */
  async function buyDecoration(
    sceneId: string,
    itemId: string,
    now = sources.now(),
  ): Promise<CustomizationPurchaseResult> {
    return d.transaction('rw', d.kv, d.decorations, async () => {
      const farm = await getFarm(now)
      const scene = accessibleCatalogScene(farm, sceneId)
      if (!scene) return { status: 'scene-mismatch', chargedEggs: 0 }
      const definedElsewhere = sources.sceneDefinitions.some(definition => (
        definition.id !== scene.id && definition.decorationCatalog.some(item => item.id === itemId)
      ))
      const item = listableDecoration(scene, itemId)
      if (!item) {
        return { status: definedElsewhere ? 'scene-mismatch' : 'item-unavailable', chargedEggs: 0 }
      }
      if (await d.decorations.get([scene.id, item.id])) return { status: 'already-owned', chargedEggs: 0 }
      if (farm.eggStock < item.eggCost) return { status: 'insufficient-eggs', chargedEggs: 0 }

      await d.decorations.add({ sceneId: scene.id, itemId: item.id, x: null, y: null })
      await setFarmStateV3(d, { ...farm, eggStock: farm.eggStock - item.eggCost })
      return { status: 'purchased', chargedEggs: item.eggCost }
    })
  }

  async function placeDecoration(
    sceneId: string,
    itemId: string,
    home: StagePoint,
    now = sources.now(),
  ): Promise<DecorationPlacementResult> {
    return d.transaction('rw', d.kv, d.decorations, async () => {
      const farm = await getFarm(now)
      const scene = accessibleCatalogScene(farm, sceneId)
      if (!scene) return { status: 'scene-mismatch', chargedEggs: 0 }
      const definedElsewhere = sources.sceneDefinitions.some(definition => (
        definition.id !== scene.id && definition.decorationCatalog.some(item => item.id === itemId)
      ))
      const item = listableDecoration(scene, itemId)
      if (!item) return { status: definedElsewhere ? 'scene-mismatch' : 'item-unavailable', chargedEggs: 0 }
      const owned = await d.decorations.get([scene.id, item.id])
      if (!owned) return { status: 'not-owned', chargedEggs: 0 }
      if (!pointWithinPlacementBounds(home, item.placementBounds)) {
        return { status: 'outside-placement-bounds', chargedEggs: 0 }
      }
      await d.decorations.put({ ...owned, x: home.x, y: home.y })
      return { status: 'placed', chargedEggs: 0 }
    })
  }

  async function storeDecoration(
    sceneId: string,
    itemId: string,
    now = sources.now(),
  ): Promise<DecorationPlacementResult> {
    return d.transaction('rw', d.kv, d.decorations, async () => {
      const farm = await getFarm(now)
      const scene = accessibleCatalogScene(farm, sceneId)
      if (!scene) return { status: 'scene-mismatch', chargedEggs: 0 }
      const definedElsewhere = sources.sceneDefinitions.some(definition => (
        definition.id !== scene.id && definition.decorationCatalog.some(item => item.id === itemId)
      ))
      const item = listableDecoration(scene, itemId)
      if (!item) return { status: definedElsewhere ? 'scene-mismatch' : 'item-unavailable', chargedEggs: 0 }
      const owned = await d.decorations.get([scene.id, item.id])
      if (!owned) return { status: 'not-owned', chargedEggs: 0 }
      await d.decorations.put({ ...owned, x: null, y: null })
      return { status: 'stored', chargedEggs: 0 }
    })
  }

  /** 装扮所有权全局唯一；解锁场景只决定目录可用性，不把所有权绑到当前查看场景。 */
  async function buyCosmetic(itemId: string, now = sources.now()): Promise<CustomizationPurchaseResult> {
    return d.transaction('rw', d.kv, d.cosmetics, async () => {
      const farm = await getFarm(now)
      const item = listableCosmetic(farm, itemId)
      if (!item) return { status: 'item-unavailable', chargedEggs: 0 }
      if (await d.cosmetics.get(item.id)) return { status: 'already-owned', chargedEggs: 0 }
      if (farm.eggStock < item.eggCost) return { status: 'insufficient-eggs', chargedEggs: 0 }

      const owned: OwnedCosmeticRow = { itemId: item.id, acquiredAt: now }
      await d.cosmetics.add(owned)
      await setFarmStateV3(d, { ...farm, eggStock: farm.eggStock - item.eggCost })
      return { status: 'purchased', chargedEggs: item.eggCost }
    })
  }

  async function equipCosmetic(
    target: CharacterTarget,
    slot: CharacterCosmeticSlot,
    itemId: string,
    now = sources.now(),
  ): Promise<CosmeticEquipResult> {
    return d.transaction('rw', d.kv, d.cosmetics, async () => {
      const farm = await getFarm(now)
      const item = listableCosmetic(farm, itemId)
      if (!item) return { status: 'item-unavailable', chargedEggs: 0 }
      if (!(await d.cosmetics.get(item.id))) return { status: 'not-owned', chargedEggs: 0 }
      const equipped = equipLoadoutItem(await getLoadout(), item, target, slot)
      if (!equipped.ok) return { status: equipped.reason, chargedEggs: 0 }
      await setKV(d, 'loadout', equipped.loadout)
      return { status: 'equipped', chargedEggs: 0 }
    })
  }

  async function unequipCosmetic(
    target: CharacterTarget,
    slot: CharacterCosmeticSlot,
  ): Promise<CosmeticEquipResult> {
    return d.transaction('rw', d.kv, async () => {
      const unequipped = unequipLoadoutItem(await getLoadout(), target, slot)
      if (!unequipped.ok) return { status: unequipped.reason, chargedEggs: 0 }
      await setKV(d, 'loadout', unequipped.loadout)
      return { status: 'unequipped', chargedEggs: 0 }
    })
  }

  /** 拖放落点持久化(1194×834 逻辑坐标) */
  async function placeChick(
    chickId: string,
    home: StagePoint,
    now = sources.now(),
    sceneId?: string,
  ): Promise<boolean> {
    if (!Number.isFinite(home.x) || !Number.isFinite(home.y)) return false
    return d.transaction('rw', d.chicks, d.kv, async () => {
      const [farm, chick] = await Promise.all([getFarm(now), d.chicks.get(chickId)])
      const scene = enteredScene(farm, sceneId)
      if (!scene || !chick || chick.sceneId !== scene.id) return false
      return (await d.chicks.update(chickId, { homeX: home.x, homeY: home.y })) === 1
    })
  }

  /** 收藏、取消及显式替换在同一事务中完成；并发第 8/9 次点击会串行重读最新状态。 */
  async function favoriteChick(
    chickId: string,
    replaceFavoriteId?: string,
    now = sources.now(),
    sceneId?: string,
  ): Promise<FavoriteChickUsecaseResult> {
    return d.transaction('rw', d.chicks, d.kv, async () => {
      const farm = await getFarm(now)
      const target = await d.chicks.get(chickId)
      const scene = enteredScene(farm, sceneId)
      if (!scene || !target || target.sceneId !== scene.id) return { status: 'invalid-target' }

      const sceneRows = await d.chicks.where('sceneId').equals(scene.id).toArray()
      const orderedRows = sceneRows.map(chick => ({ ...chick, hatchedAt: persistedChickHatchedAt(chick) }))
      const change = toggleFavoriteChick(orderedRows, scene.id, chickId, replaceFavoriteId)
      if (change.status === 'replacement-required') {
        const ids = new Set(change.replaceableFavoriteIds)
        return {
          status: 'replacement-required',
          targetChickId: chickId,
          replaceableFavorites: orderedRows.filter(chick => ids.has(chick.chickId)),
        }
      }
      if (change.status !== 'updated') return { status: change.status }

      const before = new Map(orderedRows.map(chick => [chick.chickId, chick.favorite]))
      const changed = change.chicks.filter(chick => before.get(chick.chickId) !== chick.favorite)
      if (changed.length) await d.chicks.bulkPut(changed)
      return { status: 'updated' }
    })
  }

  /**
   * 小鸡群聊:陈旧度加权抽 1+N 个已学词,更新"见面时间"。
   * 邻居由视觉层按几何挑选;只有 primary 播 TTS(调用方负责,SPEC §2.6)
   */
  async function chickChat(
    chickId: string,
    neighborIds: string[],
    now = sources.now(),
    sceneId?: string,
  ): Promise<ChickChatVM | null> {
    return d.transaction('rw', d.cards, d.chicks, d.kv, d.seen, async () => {
      const [farm, primaryChick] = await Promise.all([getFarm(now), d.chicks.get(chickId)])
      const scene = enteredScene(farm, sceneId)
      if (!scene || !primaryChick || primaryChick.sceneId !== scene.id) return null

      const requestedNeighbors = [...new Set(neighborIds)]
        .filter(id => id !== chickId)
        .slice(0, CHAT_NEIGHBOR_CAP)
      const neighborRows = await d.chicks.bulkGet(requestedNeighbors)
      const validNeighborIds = requestedNeighbors.filter((_, index) => neighborRows[index]?.sceneId === scene.id)

      const [cards, seenRows] = await Promise.all([d.cards.toArray(), d.seen.toArray()])
      const seenMap = new Map(seenRows.map(r => [r.wordId, r.lastSeenAt]))
      const pool = cards
        .filter(card => WORD_MAP.has(card.wordId))
        .map(card => {
          const reviewedAt = card.card.last_review ? new Date(card.card.last_review).getTime() : 0
          return {
            wordId: card.wordId,
            lastSeenAt: seenMap.get(card.wordId) ?? (Number.isFinite(reviewedAt) ? reviewedAt : 0),
          }
        })
      if (pool.length === 0) return null

      const drawn = weightedSample(pool, 1 + validNeighborIds.length, now)
      await d.seen.bulkPut(drawn.map(wordId => ({ wordId, lastSeenAt: now })))

      const entry = (wordId: string, id: string) => {
        const word = WORD_MAP.get(wordId)!
        return { chickId: id, word: word.word, meaning: word.meaning }
      }
      return {
        primary: entry(drawn[0], chickId),
        others: drawn.slice(1).map((wordId, index) => entry(wordId, validNeighborIds[index])),
        expiresAt: now + CHAT_TTL_MS,
      }
    })
  }

  async function setMotion(enabled: boolean): Promise<void> {
    const settings = await getKV<Settings>(d, 'settings', DEFAULT_SETTINGS)
    await setKV(d, 'settings', { ...settings, motionEnabled: enabled })
  }

  async function snapshot(now = sources.now(), viewedSceneId?: string): Promise<FarmSnapshot> {
    const today = dayKeyOf(now)
    const farm = await getFarm(now)
    const viewedScene = enteredScene(farm, viewedSceneId)
    if (!viewedScene) throw new Error('At least one local farm scene definition is required')
    const [meta, settings, session, sceneChicks, rescueCount, decorationRows, ownedCosmetics, loadout] = await Promise.all([
      getMeta(now),
      getKV<Settings>(d, 'settings', DEFAULT_SETTINGS),
      d.sessions.get(today),
      d.chicks.where('sceneId').equals(viewedScene.id).sortBy('bornOn'),
      d.rescue.count(),
      d.decorations.where('sceneId').equals(viewedScene.id).toArray(),
      d.cosmetics.toArray(),
      getLoadout(),
    ])
    const orderedSceneChicks = sceneChicks.map(chick => ({
      ...chick,
      hatchedAt: persistedChickHatchedAt(chick),
    }))
    const collection = collectSceneChicks(orderedSceneChicks, viewedScene.id)
    return {
      farm,
      meta,
      motionEnabled: settings.motionEnabled,
      session: session ?? { date: today, reviewIds: [], newIds: [], doneCount: 0, answered: 0, correct: 0, completed: false },
      chicksTotal: sceneChicks.length,
      latestChicks: collection.visible,
      allSceneChicks: [...collection.visible, ...collection.inCoop],
      favoriteCount: collection.favoriteCount,
      rescueCount,
      now,
      viewedSceneId: viewedScene.id,
      sceneDefinitions: sources.sceneDefinitions,
      decorationRows,
      ownedCosmetics,
      loadout,
      cosmeticDefinitions: sources.cosmeticDefinitions,
      includeInternalPlaceholders: sources.includeInternalPlaceholders,
    }
  }

  async function loadViewModel(now = sources.now(), viewedSceneId?: string) {
    return assembleViewModel(await snapshot(now, viewedSceneId))
  }

  return {
    clockGuard,
    completeDailyLesson,
    nameHen,
    allocateEggToHatch,
    startMeal,
    mealAnimationDone,
    serveMeal,
    resolveMealBeforeTravel,
    acknowledgeChapter,
    travelToNextScene,
    buyDecoration,
    placeDecoration,
    storeDecoration,
    buyCosmetic,
    equipCosmetic,
    unequipCosmetic,
    placeChick,
    favoriteChick,
    chickChat,
    setMotion,
    snapshot,
    loadViewModel,
  }
}

export type FarmUsecases = ReturnType<typeof createFarmUsecases>
