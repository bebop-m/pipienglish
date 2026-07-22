// F4 首页只读 ViewModel 与事件契约(架构方案 §4/§5)
// 所有坐标均为 1194×834 逻辑坐标;Codex 视觉层只消费本文件类型

import type { DailySession, MetaState, StagePoint } from '../domain/types'
import { VISIBLE_CHICK_CAP } from '../domain/types'
import { estimatedMinutes, totalItems } from '../domain/dailyPlan'
import { eggsEarnedFor } from '../domain/eggEconomy'
import { hatchesAt, remainingHatchMs } from '../domain/hatchTiming'
import { dayKeyOf } from '../domain/time'
import type { ChickRarity } from '../domain/hatchRarity'
import { canStartMeal, RECIPE_EGG_COSTS, type CookingMeal, type RecipeId } from '../domain/meals'
import type { FarmStateV3, PersistedChick } from './farmPersistence'
import { persistedChickHatchedAt } from './farmPersistence'
import {
  availableChapter as deriveAvailableChapter,
  eligibleChapter as deriveEligibleChapter,
  enterableChapter as deriveEnterableChapter,
  nextCelebrationChapter,
  nextTravelChapter,
  pendingTravelChapters,
} from '../domain/farmChapters'
import {
  FARM_SCENE_DEFINITIONS,
  sceneById,
  type DecorationCatalogItemDefinition,
  type FixedSceneVisualDefinition,
  type FarmSceneDefinition,
  type HatcheryVisualStates,
  type SceneCharacterVisuals,
  type StageRenderBox,
} from '../domain/farmScenes'
import {
  FARM_COSMETIC_DEFINITIONS,
  type CosmeticItemDefinition,
} from '../domain/farmCosmetics'
import { assetIsListable, loadoutItem } from '../domain/farmCustomization'
import {
  defaultCharacterLoadout,
  type DecorationRow,
  type OwnedCosmeticRow,
} from './farmPersistence'
import type { CharacterLoadout } from '../domain/farmCatalog'

export type FarmHomeState = 'first_visit' | 'daily_incomplete' | 'daily_complete'
export type FarmOverlay =
  | 'none'
  | 'egg_panel'
  | 'hatchery_pop'
  | 'rescue_pop'
  | 'coop'
  | 'map'
  | 'chapter_celebration'
  | 'travel_meal_prompt'
  | 'sticker_catalog'
  | 'wardrobe'

export interface IncubatingEggVM {
  placedAt: number
  hatchesAt: number
  remainingMs: number
}

export interface FarmChickVM {
  chickId: string
  bornOn: string
  hatchedAt: number
  sceneId: string
  rarity: ChickRarity
  variantId: string
  favorite: boolean
  home: StagePoint | null // 手动散步中心;null = 视觉层分区安排
  isNewToday: boolean
}

export interface HatchTransitionVM {
  chickId: string
  sceneId: string
  phase: 'two_shells' | 'outcome'
  rarity: ChickRarity
  variantId: string
}

export interface FavoriteReplacementVM {
  targetChickId: string
  candidates: FarmChickVM[]
}

export interface ChickChatVM {
  primary: { chickId: string; word: string; meaning: string } // 只有它播 TTS
  others: Array<{ chickId: string; word: string; meaning: string }>
  expiresAt: number
}

export interface FarmSceneVM {
  id: string
  chapter: number
  title: string
  subtitle: string
  backgroundAssetId: string
  thumbnailAssetId: string
  assetStatus: 'approved' | 'internal-placeholder'
  hatcheryVisualStates: HatcheryVisualStates
  hatcheryRenderBox: StageRenderBox
  characterVisuals: SceneCharacterVisuals
  fixedVisuals: readonly FixedSceneVisualDefinition[]
  active: boolean
  viewed: boolean
  entered: boolean
  visitEnabled: boolean
  travelEnabled: boolean
}

export interface FarmSceneCapabilitiesVM {
  learning: boolean
  hatchery: boolean
  kitchen: boolean
  rescue: boolean
  chickChat: true
  coop: true
  returnToCurrentJourney: boolean
}

export interface DecorationCatalogItemVM {
  definition: DecorationCatalogItemDefinition
  owned: boolean
  placement: StagePoint | null
}

export interface WardrobeItemVM {
  definition: CosmeticItemDefinition
  owned: boolean
  equipped: boolean
}

export interface FarmHomeViewModel {
  hydrated: boolean
  state: FarmHomeState
  activeSceneId: string
  viewedSceneId: string
  isViewingCurrentJourney: boolean
  activeScene: FarmSceneVM
  viewedScene: FarmSceneVM
  sceneMap: FarmSceneVM[]
  eligibleChapter: number
  availableChapter: number
  enterableChapter: number
  acknowledgedSceneChapter: number
  pendingCelebrationScene: FarmSceneVM | null
  nextTravelScene: FarmSceneVM | null
  pendingTravelChapters: number[]
  sceneCapabilities: FarmSceneCapabilitiesVM
  dayNumber: number
  streak: number
  henName: string | null
  learnedToday: number // 已完成的复习词 + 已完成见面/自测的新词,用于任务板“朋友”进度
  newWordsLearnedToday: number // 仅新词,用于顶栏“今日单词”
  dailyTarget: number
  reviewCountToday: number
  newWordsPaused: boolean
  totalItemsToday: number
  estimatedMinutes: number
  eggStock: number
  eggsEarnedToday: number // 完成前 = 预告值(任务板「奖励 ×N」),完成后 = 实得值
  incubating: IncubatingEggVM | null
  hatchTransition: HatchTransitionVM | null
  chicksTotal: number
  chicksVisible: FarmChickVM[]
  chicksCaptured: FarmChickVM[] // 在救援篮里等待接回家;总数永不减少
  chicksAll: FarmChickVM[]
  chicksInCoop: number
  favoriteCount: number
  rescueCount: number
  cookingMeal: CookingMeal | null
  availableRecipes: Array<{ recipeId: RecipeId; eggCost: 1 | 5 | 20; enabled: boolean }>
  decorationCatalog: DecorationCatalogItemVM[]
  placedDecorations: DecorationCatalogItemVM[]
  wardrobeCatalog: WardrobeItemVM[]
  ownedCosmeticIds: string[]
  loadout: CharacterLoadout
  overlay: FarmOverlay // 由视觉桥(useFarmHome)本地维护,不持久化
  chat: ChickChatVM | null
  favoriteReplacement: FavoriteReplacementVM | null
  arrivingChick: FarmChickVM | null
  motionEnabled: boolean
  musicEnabled: boolean
}

export type FarmHomeEvent =
  | { type: 'NAME_HEN'; name: string }
  | { type: 'START_DAILY_LESSON' }
  | { type: 'OPEN_HANDWRITING_GAME' }
  | { type: 'DAILY_LESSON_COMPLETED'; newWords: number; reviews: number }
  | { type: 'OPEN_EGG_PANEL' }
  | { type: 'CLOSE_EGG_PANEL' }
  | { type: 'TOGGLE_HATCHERY_POP' }
  | { type: 'TOGGLE_RESCUE_POP' }
  | { type: 'OPEN_COOP' }
  | { type: 'CLOSE_COOP' }
  | { type: 'OPEN_SCENE_MAP' }
  | { type: 'CLOSE_SCENE_MAP' }
  | { type: 'VISIT_SCENE'; sceneId: string }
  | { type: 'RETURN_ACTIVE_SCENE' }
  | { type: 'STAY_IN_CURRENT_SCENE'; chapter: number }
  | { type: 'TRAVEL_TO_NEXT_SCENE' }
  | { type: 'RESOLVE_TRAVEL_MEAL'; choice: 'serve_first' | 'refund' }
  | { type: 'OPEN_DECORATION_CATALOG' }
  | { type: 'CLOSE_DECORATION_CATALOG' }
  | { type: 'BUY_DECORATION'; sceneId: string; itemId: string }
  | { type: 'PLACE_DECORATION'; sceneId: string; itemId: string; home: StagePoint }
  | { type: 'STORE_DECORATION'; sceneId: string; itemId: string }
  | { type: 'OPEN_WARDROBE' }
  | { type: 'CLOSE_WARDROBE' }
  | { type: 'BUY_COSMETIC'; itemId: string }
  | { type: 'EQUIP_COSMETIC'; target: 'xiaopi' | 'mother'; slot: 'headLook' | 'outfit' | 'accessory' | 'headwear' | 'neckwear'; itemId: string }
  | { type: 'UNEQUIP_COSMETIC'; target: 'xiaopi' | 'mother'; slot: 'headLook' | 'outfit' | 'accessory' | 'headwear' | 'neckwear' }
  | { type: 'TOGGLE_CHICK_FAVORITE'; chickId: string }
  | { type: 'REPLACE_FAVORITE_CHICK'; replaceChickId: string }
  | { type: 'CANCEL_FAVORITE_REPLACEMENT' }
  | { type: 'ALLOCATE_EGG_TO_HATCH' }
  | { type: 'START_RECIPE'; recipeId: RecipeId }
  | { type: 'COOKING_DONE' }
  | { type: 'SERVE_SINGLE'; chickId: string }
  | { type: 'SERVE_GROUP' }
  | { type: 'OPEN_RESCUE' }
  | { type: 'CHICK_CHAT'; chickId: string; neighborIds: string[] }
  | { type: 'CHAT_DISMISSED' }
  | { type: 'CHICK_PLACED'; chickId: string; home: StagePoint }
  | { type: 'SET_MOTION'; enabled: boolean }
  | { type: 'SET_MUSIC'; enabled: boolean }
  | { type: 'OPEN_PARENT' }

export interface FarmSnapshot {
  farm: FarmStateV3
  meta: MetaState
  motionEnabled: boolean
  musicEnabled?: boolean // 旧快照/测试夹具缺省按开
  session: DailySession
  chicksTotal: number
  latestChicks: PersistedChick[] // 当前场景最新 ≤40 只,bornOn 降序
  capturedChicks?: PersistedChick[] // 被抓进救援篮的(不在草地上,但仍计入 chicksTotal)
  allSceneChicks?: PersistedChick[]
  favoriteCount?: number
  rescueCount: number
  now: number
  viewedSceneId?: string
  sceneDefinitions?: readonly FarmSceneDefinition[]
  decorationRows?: DecorationRow[]
  ownedCosmetics?: OwnedCosmeticRow[]
  loadout?: CharacterLoadout
  cosmeticDefinitions?: readonly CosmeticItemDefinition[]
  includeInternalPlaceholders?: boolean
}

function chickViewModel(chick: PersistedChick, today: string): FarmChickVM {
  return {
    chickId: chick.chickId,
    bornOn: chick.bornOn,
    hatchedAt: persistedChickHatchedAt(chick),
    sceneId: chick.sceneId,
    rarity: chick.rarity,
    variantId: chick.variantId,
    favorite: chick.favorite,
    home: chick.homeX != null && chick.homeY != null ? { x: chick.homeX, y: chick.homeY } : null,
    isNewToday: chick.bornOn === today,
  }
}

/** 纯函数:快照 → 核心 VM(overlay/chat/入场态由视觉桥本地合并) */
export function assembleViewModel(
  s: FarmSnapshot,
): Omit<FarmHomeViewModel, 'overlay' | 'chat' | 'favoriteReplacement' | 'arrivingChick' | 'hatchTransition'> {
  const { farm, meta, session } = s
  const state: FarmHomeState =
    farm.henName == null ? 'first_visit' : session.completed ? 'daily_complete' : 'daily_incomplete'
  const items = totalItems(session)
  const reviewDone = Math.min(session.doneCount, session.reviewIds.length)
  const newStepsDone = Math.max(0, session.doneCount - session.reviewIds.length)
  const newWordsLearnedToday = Math.min(session.newIds.length, Math.floor(newStepsDone / 2))
  const today = dayKeyOf(s.now)
  const sceneDefinitions = s.sceneDefinitions ?? FARM_SCENE_DEFINITIONS
  const packagedChapter = deriveAvailableChapter(sceneDefinitions)
  const eligible = deriveEligibleChapter(meta.totalDays)
  const enterable = deriveEnterableChapter(meta.totalDays, packagedChapter)
  const activeDefinition = sceneById(farm.activeSceneId, sceneDefinitions)
    ?? sceneDefinitions[0]
  if (!activeDefinition) throw new Error('At least one local farm scene definition is required')
  const activeChapter = activeDefinition.chapter
  const requestedViewed = sceneById(s.viewedSceneId ?? farm.activeSceneId, sceneDefinitions)
  const viewedDefinition = requestedViewed && requestedViewed.chapter <= activeChapter
    ? requestedViewed
    : activeDefinition
  const nextTravel = nextTravelChapter(activeChapter, enterable)
  const celebration = nextCelebrationChapter(farm.acknowledgedSceneChapter, enterable)
  const toSceneVM = (scene: FarmSceneDefinition): FarmSceneVM => ({
    id: scene.id,
    chapter: scene.chapter,
    title: scene.title,
    subtitle: scene.subtitle,
    backgroundAssetId: scene.backgroundAssetId,
    thumbnailAssetId: scene.thumbnailAssetId,
    assetStatus: scene.assetStatus,
    hatcheryVisualStates: scene.hatcheryVisualStates,
    hatcheryRenderBox: scene.hatcheryRenderBox,
    characterVisuals: scene.characterVisuals,
    fixedVisuals: scene.fixedVisuals,
    active: scene.id === activeDefinition.id,
    viewed: scene.id === viewedDefinition.id,
    entered: scene.chapter <= activeChapter,
    visitEnabled: scene.chapter <= activeChapter,
    travelEnabled: scene.chapter === nextTravel,
  })
  const sceneMap = sceneDefinitions
    .filter(scene => scene.chapter <= enterable)
    .sort((left, right) => left.chapter - right.chapter)
    .map(toSceneVM)
  const activeScene = toSceneVM(activeDefinition)
  const viewedScene = toSceneVM(viewedDefinition)
  const decorationRows = s.decorationRows ?? []
  const decorationByItemId = new Map(
    decorationRows
      .filter(row => row.sceneId === viewedDefinition.id)
      .map(row => [row.itemId, row]),
  )
  const decorationCatalog = viewedDefinition.decorationCatalog
    .filter(item => assetIsListable(item.assetStatus, s.includeInternalPlaceholders ?? false))
    .map(item => {
      const row = decorationByItemId.get(item.id)
      return {
        definition: item,
        owned: Boolean(row),
        placement: row?.x != null && row.y != null ? { x: row.x, y: row.y } : null,
      }
    })
  const loadout = s.loadout ?? defaultCharacterLoadout()
  const ownedCosmeticIds = (s.ownedCosmetics ?? []).map(row => row.itemId)
  const ownedCosmeticSet = new Set(ownedCosmeticIds)
  const enteredCosmeticIds = new Set(
    sceneDefinitions
      .filter(scene => scene.chapter <= activeChapter)
      .flatMap(scene => scene.cosmeticItemIds),
  )
  const wardrobeCatalog = (s.cosmeticDefinitions ?? FARM_COSMETIC_DEFINITIONS)
    .filter(item => enteredCosmeticIds.has(item.id))
    .filter(item => assetIsListable(item.assetStatus, s.includeInternalPlaceholders ?? false))
    .map(item => ({
      definition: item,
      owned: ownedCosmeticSet.has(item.id),
      equipped: loadoutItem(loadout, item.target, item.slot) === item.id,
    }))
  return {
    hydrated: true,
    state,
    activeSceneId: activeDefinition.id,
    viewedSceneId: viewedDefinition.id,
    isViewingCurrentJourney: viewedDefinition.id === activeDefinition.id,
    activeScene,
    viewedScene,
    sceneMap,
    eligibleChapter: eligible,
    availableChapter: packagedChapter,
    enterableChapter: enterable,
    acknowledgedSceneChapter: Math.min(farm.acknowledgedSceneChapter, enterable),
    pendingCelebrationScene: celebration ? sceneMap.find(scene => scene.chapter === celebration) ?? null : null,
    nextTravelScene: nextTravel ? sceneMap.find(scene => scene.chapter === nextTravel) ?? null : null,
    pendingTravelChapters: pendingTravelChapters(activeChapter, enterable),
    sceneCapabilities: {
      learning: viewedDefinition.id === activeDefinition.id,
      hatchery: viewedDefinition.id === activeDefinition.id,
      kitchen: viewedDefinition.id === activeDefinition.id,
      rescue: viewedDefinition.id === activeDefinition.id,
      chickChat: true,
      coop: true,
      returnToCurrentJourney: viewedDefinition.id !== activeDefinition.id,
    },
    dayNumber: meta.totalDays + (session.completed ? 0 : 1),
    streak: meta.streak,
    henName: farm.henName,
    learnedToday: reviewDone + newWordsLearnedToday,
    newWordsLearnedToday,
    dailyTarget: session.newIds.length,
    reviewCountToday: session.reviewIds.length,
    newWordsPaused: session.newWordsPaused ?? false,
    totalItemsToday: session.reviewIds.length + session.newIds.length,
    estimatedMinutes: estimatedMinutes(session),
    eggStock: farm.eggStock,
    eggsEarnedToday: eggsEarnedFor(items),
    incubating: farm.incubating
      ? {
          placedAt: farm.incubating.placedAt,
          hatchesAt: hatchesAt(farm.incubating.placedAt),
          remainingMs: remainingHatchMs(farm.incubating.placedAt, s.now),
        }
      : null,
    chicksTotal: s.chicksTotal,
    chicksVisible: s.latestChicks.slice(0, VISIBLE_CHICK_CAP).map(chick => chickViewModel(chick, today)),
    chicksCaptured: (s.capturedChicks ?? []).map(chick => chickViewModel(chick, today)),
    chicksAll: (s.allSceneChicks ?? s.latestChicks).map(chick => chickViewModel(chick, today)),
    chicksInCoop: Math.max(0, s.chicksTotal - s.latestChicks.length - (s.capturedChicks?.length ?? 0)),
    favoriteCount: s.favoriteCount ?? s.latestChicks.filter(chick => chick.favorite).length,
    rescueCount: s.rescueCount,
    cookingMeal: farm.cookingMeal,
    availableRecipes: (Object.entries(RECIPE_EGG_COSTS) as Array<[RecipeId, 1 | 5 | 20]>).map(
      ([recipeId, eggCost]) => ({
        recipeId,
        eggCost,
        enabled: canStartMeal({
          eggStock: farm.eggStock,
          currentSceneChickCount: viewedDefinition.id === activeDefinition.id ? s.chicksTotal : 0,
          cookingMeal: farm.cookingMeal,
        }, recipeId),
      }),
    ),
    decorationCatalog,
    placedDecorations: decorationCatalog.filter(item => item.owned && item.placement !== null),
    wardrobeCatalog,
    ownedCosmeticIds,
    loadout,
    motionEnabled: s.motionEnabled,
    musicEnabled: s.musicEnabled ?? true,
  }
}
