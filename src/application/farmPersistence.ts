import {
  DEFAULT_CHARACTER_LOADOUT,
  DEFAULT_NORMAL_CHICK_VARIANT_ID,
  type CharacterLoadout,
} from '../domain/farmCatalog'
import type { ChickRarity, HatchOutcome } from '../domain/hatchRarity'
import type { CookingMeal } from '../domain/meals'
import type { Chick, FarmState } from '../domain/types'

export const DEFAULT_SCENE_ID = 'scene-1' as const

export interface MigrationContext {
  now: number
  today: string
}

export interface FarmStateV3 {
  henName: string | null
  eggStock: number
  incubating: HatchOutcome | null
  cookingMeal: CookingMeal | null
  activeSceneId: string
  acknowledgedSceneChapter: number
  normalHatchStreak: number
  nonSpecialHatchStreak: number
}

export interface PersistedChick extends Chick {
  sceneId: string
  rarity: ChickRarity
  variantId: string
  favorite: boolean
  /** 新孵小鸡使用精确毫秒；旧记录缺失时由 persistedChickHatchedAt 提供稳定兼容次序。 */
  hatchedAt?: number
}

export interface DecorationRow {
  sceneId: string
  itemId: string
  x: number | null
  y: number | null
}

export interface OwnedCosmeticRow {
  itemId: string
  acquiredAt: number
}

export interface SceneMemoryRow {
  sceneId: string
  celebrationPhotoCreatedAt: number | null
}

export function defaultCharacterLoadout(): CharacterLoadout {
  return {
    xiaopi: { ...DEFAULT_CHARACTER_LOADOUT.xiaopi },
    mother: { ...DEFAULT_CHARACTER_LOADOUT.mother },
  }
}

export function defaultFarmStateV3(): FarmStateV3 {
  return {
    henName: null,
    eggStock: 0,
    incubating: null,
    cookingMeal: null,
    activeSceneId: DEFAULT_SCENE_ID,
    acknowledgedSceneChapter: 1,
    normalHatchStreak: 0,
    nonSpecialHatchStreak: 0,
  }
}

function stableIdOffset(chickId: string): number {
  let hash = 2166136261
  for (let index = 0; index < chickId.length; index += 1) {
    hash ^= chickId.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 86_400_000
}

/** 旧 bornOn 只有本地日时，用 chickId 稳定打散；不会伪造精确历史，但每次排序结果一致。 */
export function persistedChickHatchedAt(chick: Pick<PersistedChick, 'chickId' | 'bornOn' | 'hatchedAt'>): number {
  if (typeof chick.hatchedAt === 'number' && Number.isFinite(chick.hatchedAt)) return chick.hatchedAt
  const parsed = Date.parse(chick.bornOn.includes('T') ? chick.bornOn : `${chick.bornOn}T00:00:00.000Z`)
  return (Number.isFinite(parsed) ? parsed : 0) + stableIdOffset(chick.chickId)
}

export function persistedChickWithDefaults(
  chick: Chick,
  sceneId: string = DEFAULT_SCENE_ID,
  hatchedAt?: number,
): PersistedChick {
  return {
    ...chick,
    sceneId,
    rarity: 'normal',
    variantId: DEFAULT_NORMAL_CHICK_VARIANT_ID,
    favorite: false,
    hatchedAt: typeof hatchedAt === 'number' && Number.isFinite(hatchedAt)
      ? hatchedAt
      : persistedChickHatchedAt(chick),
  }
}

export function isFarmStateV3(value: unknown): value is FarmStateV3 {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<FarmStateV3> & { incubating?: unknown }
  return !Array.isArray(candidate.incubating)
    && typeof candidate.activeSceneId === 'string'
    && typeof candidate.acknowledgedSceneChapter === 'number'
    && typeof candidate.normalHatchStreak === 'number'
    && typeof candidate.nonSpecialHatchStreak === 'number'
    && 'cookingMeal' in candidate
}

/** 仅供尚未迁移的旧料理用例与旧夹具消费；新奖励/孵化/首页链路直接使用 v3。 */
export function farmStateV3ToLegacy(value: FarmStateV3): FarmState {
  const cooking = value.cookingMeal?.phase ?? 'empty'
  return {
    henName: value.henName,
    eggStock: value.eggStock,
    incubating: value.incubating ? [{ slot: 0, placedAt: value.incubating.placedAt }] : [],
    cooking,
  }
}

/**
 * 兼容旧应用写入：保留 v3 隐藏外观、保底和场景状态。旧多巢写入按正式迁移规则
 * 保留最早一颗并逐颗退款；旧料理仅作为单份料理兼容，不引入新交互。
 */
export function legacyFarmStateToV3(
  value: FarmState,
  context: MigrationContext,
  current?: FarmStateV3,
): FarmStateV3 {
  const base = current ?? defaultFarmStateV3()
  const eggs = [...value.incubating].sort((left, right) => left.placedAt - right.placedAt)
  const kept = eggs[0]
  const incubating = kept
    ? current?.incubating?.placedAt === kept.placedAt
      ? current.incubating
      : {
          placedAt: kept.placedAt,
          rarity: 'normal' as const,
          variantId: DEFAULT_NORMAL_CHICK_VARIANT_ID,
        }
    : null

  const persistedPhase = value.cooking === 'cooking' ? 'raw' : value.cooking
  const cookingMeal = persistedPhase === 'empty'
    ? null
    : current?.cookingMeal?.phase === persistedPhase
      ? current.cookingMeal
      : {
          recipeId: 'single_fried_egg' as const,
          eggCost: 1 as const,
          phase: persistedPhase,
          startedAt: context.now,
        }

  const retainedEggAlreadyMigrated = Boolean(
    kept && current?.incubating?.placedAt === kept.placedAt && eggs.length > 1,
  )
  const eggStock = retainedEggAlreadyMigrated
    ? current!.eggStock
    : value.eggStock + Math.max(0, eggs.length - 1)

  return {
    ...base,
    henName: value.henName,
    eggStock,
    incubating,
    cookingMeal,
  }
}
