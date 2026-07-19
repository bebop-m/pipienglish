import { DEFAULT_NORMAL_CHICK_VARIANT_ID, type CharacterLoadout } from '../domain/farmCatalog'
import type { ChickRarity, HatchOutcome } from '../domain/hatchRarity'
import type { CookingMeal } from '../domain/meals'
import { addDays } from '../domain/time'
import type { MetaState, Settings } from '../domain/types'
import {
  DEFAULT_SCENE_ID,
  defaultCharacterLoadout,
  defaultFarmStateV3,
  persistedChickHatchedAt,
  type DecorationRow,
  type FarmStateV3,
  type MigrationContext,
  type OwnedCosmeticRow,
  type PersistedChick,
  type SceneMemoryRow,
} from './farmPersistence'

export interface KVRow {
  key: string
  value: unknown
}

export interface FarmV1 {
  henName: string
  chicks: number
  pendingEggs: { date: string; n: number }[]
}

export interface FarmStateV2 {
  henName: string | null
  eggStock: number
  incubating: Array<{ slot?: number; placedAt: number }>
  cooking?: 'empty' | 'raw' | 'cooking' | 'ready'
}

export interface ChickV2 {
  chickId: string
  bornOn: string
  source: 'hatch' | 'migration'
  homeX: number | null
  homeY: number | null
}

export interface FarmArchiveV3 {
  version: 3
  exportedAt: string
  cards: unknown[]
  sessions: unknown[]
  kv: KVRow[]
  chicks: PersistedChick[]
  seen: unknown[]
  rescue: unknown[]
  ink: unknown[]
  decorations: DecorationRow[]
  cosmetics: OwnedCosmeticRow[]
  sceneMemory: SceneMemoryRow[]
}

export type { MigrationContext } from './farmPersistence'

type UnknownRecord = Record<string, unknown>

function record(value: unknown, message: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(message)
  return value as UnknownRecord
}

function rows(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function nonNegativeInteger(value: unknown, fallback: number, name: string): number {
  if (value === undefined) return fallback
  if (!Number.isInteger(value) || (value as number) < 0) throw new RangeError(`${name} must be a non-negative integer`)
  return value as number
}

function finiteTimestamp(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be a finite timestamp`)
  return value
}

function asKvRows(value: unknown): KVRow[] {
  return rows(value).map((row, index) => {
    const item = record(row, `kv[${index}] must be an object`)
    if (typeof item.key !== 'string') throw new TypeError(`kv[${index}].key must be a string`)
    return { key: item.key, value: item.value }
  })
}

function kvValue(kv: readonly KVRow[], key: string): unknown {
  return kv.find(row => row.key === key)?.value
}

function putKv(kv: readonly KVRow[], key: string, value: unknown): KVRow[] {
  return [...kv.filter(row => row.key !== key), { key, value }]
}

function normalizeCards(value: unknown): unknown[] {
  return rows(value).map((row, index) => {
    const item = record(row, `cards[${index}] must be an object`)
    const card = record(item.card, `cards[${index}].card must be an object`)
    const due = new Date(card.due as string | number | Date)
    if (Number.isNaN(due.getTime())) throw new TypeError(`cards[${index}].card.due must be a valid date`)
    const lastReview = card.last_review === undefined || card.last_review === null
      ? undefined
      : new Date(card.last_review as string | number | Date)
    if (lastReview && Number.isNaN(lastReview.getTime())) {
      throw new TypeError(`cards[${index}].card.last_review must be a valid date`)
    }
    return {
      ...item,
      card: {
        ...card,
        due,
        ...(lastReview ? { last_review: lastReview } : {}),
      },
    }
  })
}

function seenRowsFromCards(cards: readonly unknown[]): unknown[] {
  return cards.flatMap((row, index) => {
    const item = record(row, `cards[${index}] must be an object`)
    const card = record(item.card, `cards[${index}].card must be an object`)
    if (!(card.last_review instanceof Date)) return []
    if (typeof item.wordId !== 'string') throw new TypeError(`cards[${index}].wordId must be a string`)
    return [{ wordId: item.wordId, lastSeenAt: card.last_review.getTime() }]
  })
}

function normalizeMeta(value: unknown, today: string): MetaState {
  const item = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<MetaState> : {}
  return {
    ...item,
    streak: nonNegativeInteger(item.streak, 0, 'meta.streak'),
    lastDoneDate: typeof item.lastDoneDate === 'string' ? item.lastDoneDate : null,
    totalDays: nonNegativeInteger(item.totalDays, 0, 'meta.totalDays'),
    installDate: typeof item.installDate === 'string' ? item.installDate : today,
  }
}

function normalizeSettings(value: unknown): Settings {
  const item = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<Settings> : {}
  return { motionEnabled: typeof item.motionEnabled === 'boolean' ? item.motionEnabled : true }
}

function normalizeLoadout(value: unknown): CharacterLoadout {
  const fallback = defaultCharacterLoadout()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback
  const item = value as Partial<CharacterLoadout>
  return {
    xiaopi: {
      headLook: typeof item.xiaopi?.headLook === 'string' ? item.xiaopi.headLook : fallback.xiaopi.headLook,
      outfit: typeof item.xiaopi?.outfit === 'string' ? item.xiaopi.outfit : fallback.xiaopi.outfit,
      accessory: typeof item.xiaopi?.accessory === 'string' ? item.xiaopi.accessory : null,
    },
    mother: {
      headwear: typeof item.mother?.headwear === 'string' ? item.mother.headwear : null,
      neckwear: typeof item.mother?.neckwear === 'string' ? item.mother.neckwear : null,
    },
  }
}

function normalizeRarity(value: unknown): ChickRarity {
  if (value === 'normal' || value === 'color' || value === 'special') return value
  return 'normal'
}

function normalizeV3Chick(value: unknown, index: number, forceLegacyDefaults: boolean): PersistedChick {
  const item = record(value, `chicks[${index}] must be an object`)
  if (typeof item.chickId !== 'string' || typeof item.bornOn !== 'string') {
    throw new TypeError(`chicks[${index}] must have chickId and bornOn`)
  }
  const chick: PersistedChick = {
    chickId: item.chickId,
    bornOn: item.bornOn,
    source: item.source === 'hatch' ? 'hatch' : 'migration',
    homeX: typeof item.homeX === 'number' && Number.isFinite(item.homeX) ? item.homeX : null,
    homeY: typeof item.homeY === 'number' && Number.isFinite(item.homeY) ? item.homeY : null,
    sceneId: forceLegacyDefaults || typeof item.sceneId !== 'string' ? DEFAULT_SCENE_ID : item.sceneId,
    rarity: forceLegacyDefaults ? 'normal' : normalizeRarity(item.rarity),
    variantId: forceLegacyDefaults || typeof item.variantId !== 'string'
      ? DEFAULT_NORMAL_CHICK_VARIANT_ID
      : item.variantId,
    favorite: forceLegacyDefaults ? false : item.favorite === true,
    hatchedAt: typeof item.hatchedAt === 'number' && Number.isFinite(item.hatchedAt)
      ? item.hatchedAt
      : undefined,
  }
  return { ...chick, hatchedAt: persistedChickHatchedAt(chick) }
}

function normalizeHatchOutcome(value: unknown): HatchOutcome | null {
  if (value === null || value === undefined) return null
  const item = record(value, 'farmState.incubating must be an object or null')
  return {
    placedAt: finiteTimestamp(item.placedAt, 'farmState.incubating.placedAt'),
    rarity: normalizeRarity(item.rarity),
    variantId: typeof item.variantId === 'string' ? item.variantId : DEFAULT_NORMAL_CHICK_VARIANT_ID,
  }
}

function normalizeCookingMeal(value: unknown): CookingMeal | null {
  if (value === null || value === undefined) return null
  const item = record(value, 'farmState.cookingMeal must be an object or null')
  const recipeId = item.recipeId
  const eggCost = item.eggCost
  const phase = item.phase
  if (recipeId !== 'single_fried_egg' && recipeId !== 'picnic_platter' && recipeId !== 'celebration_feast') {
    throw new TypeError('farmState.cookingMeal.recipeId is invalid')
  }
  if (eggCost !== 1 && eggCost !== 5 && eggCost !== 20) throw new TypeError('farmState.cookingMeal.eggCost is invalid')
  if (phase !== 'raw' && phase !== 'ready') throw new TypeError('farmState.cookingMeal.phase is invalid')
  return { recipeId, eggCost, phase, startedAt: finiteTimestamp(item.startedAt, 'farmState.cookingMeal.startedAt') }
}

function migrateFarmV2(value: unknown): FarmStateV3 {
  const base = defaultFarmStateV3()
  if (value === undefined) return base
  const item = record(value, 'farmState must be an object')
  const oldEggs = rows(item.incubating)
    .map((egg, index) => {
      const old = record(egg, `farmState.incubating[${index}] must be an object`)
      return { placedAt: finiteTimestamp(old.placedAt, `farmState.incubating[${index}].placedAt`) }
    })
    .sort((left, right) => left.placedAt - right.placedAt)
  const kept = oldEggs[0]
  return {
    ...base,
    henName: typeof item.henName === 'string' && item.henName.length > 0 ? item.henName : null,
    eggStock: nonNegativeInteger(item.eggStock, 0, 'farmState.eggStock') + Math.max(0, oldEggs.length - 1),
    incubating: kept
      ? { placedAt: kept.placedAt, rarity: 'normal', variantId: DEFAULT_NORMAL_CHICK_VARIANT_ID }
      : null,
  }
}

function migrateFarmV3(value: unknown): FarmStateV3 {
  const base = defaultFarmStateV3()
  if (value === undefined) return base
  const item = record(value, 'farmState must be an object')
  return {
    henName: typeof item.henName === 'string' && item.henName.length > 0 ? item.henName : null,
    eggStock: nonNegativeInteger(item.eggStock, 0, 'farmState.eggStock'),
    incubating: normalizeHatchOutcome(item.incubating),
    cookingMeal: normalizeCookingMeal(item.cookingMeal),
    activeSceneId: typeof item.activeSceneId === 'string' ? item.activeSceneId : base.activeSceneId,
    acknowledgedSceneChapter: nonNegativeInteger(
      item.acknowledgedSceneChapter,
      base.acknowledgedSceneChapter,
      'farmState.acknowledgedSceneChapter',
    ),
    normalHatchStreak: nonNegativeInteger(item.normalHatchStreak, 0, 'farmState.normalHatchStreak'),
    nonSpecialHatchStreak: nonNegativeInteger(item.nonSpecialHatchStreak, 0, 'farmState.nonSpecialHatchStreak'),
  }
}

function migrateV1Farm(
  value: unknown,
  installDate: string,
  context: MigrationContext,
): { farmState: FarmStateV3; chicks: PersistedChick[] } {
  const base = defaultFarmStateV3()
  if (value === undefined) return { farmState: base, chicks: [] }
  const item = record(value, 'farm must be an object')
  const chicks: PersistedChick[] = []
  let sequence = 0
  const addChick = (bornOn: string) => {
    chicks.push({
      chickId: `mig-${context.now}-${sequence++}`,
      bornOn,
      source: 'migration',
      homeX: null,
      homeY: null,
      sceneId: DEFAULT_SCENE_ID,
      rarity: 'normal',
      variantId: DEFAULT_NORMAL_CHICK_VARIANT_ID,
      favorite: false,
      hatchedAt: context.now + sequence,
    })
  }

  const existingChicks = nonNegativeInteger(item.chicks, 0, 'farm.chicks')
  for (let index = 0; index < existingChicks; index += 1) addChick(installDate)

  const incubating: Array<{ placedAt: number }> = []
  for (const [groupIndex, groupValue] of rows(item.pendingEggs).entries()) {
    const group = record(groupValue, `farm.pendingEggs[${groupIndex}] must be an object`)
    if (typeof group.date !== 'string') throw new TypeError(`farm.pendingEggs[${groupIndex}].date must be a string`)
    const count = nonNegativeInteger(group.n, 0, `farm.pendingEggs[${groupIndex}].n`)
    for (let index = 0; index < count; index += 1) {
      if (group.date < context.today) addChick(addDays(group.date, 1))
      else incubating.push({ placedAt: context.now })
    }
  }

  const kept = incubating[0]
  return {
    farmState: {
      ...base,
      henName: typeof item.henName === 'string' && item.henName.length > 0 ? item.henName : null,
      eggStock: Math.max(0, incubating.length - 1),
      incubating: kept
        ? { placedAt: kept.placedAt, rarity: 'normal', variantId: DEFAULT_NORMAL_CHICK_VARIANT_ID }
        : null,
    },
    chicks,
  }
}

function normalizeDecorations(value: unknown): DecorationRow[] {
  return rows(value).map((row, index) => {
    const item = record(row, `decorations[${index}] must be an object`)
    if (typeof item.sceneId !== 'string' || typeof item.itemId !== 'string') {
      throw new TypeError(`decorations[${index}] must have sceneId and itemId`)
    }
    return {
      sceneId: item.sceneId,
      itemId: item.itemId,
      x: typeof item.x === 'number' && Number.isFinite(item.x) ? item.x : null,
      y: typeof item.y === 'number' && Number.isFinite(item.y) ? item.y : null,
    }
  })
}

function normalizeCosmetics(value: unknown): OwnedCosmeticRow[] {
  return rows(value).map((row, index) => {
    const item = record(row, `cosmetics[${index}] must be an object`)
    if (typeof item.itemId !== 'string') throw new TypeError(`cosmetics[${index}].itemId must be a string`)
    return { itemId: item.itemId, acquiredAt: finiteTimestamp(item.acquiredAt, `cosmetics[${index}].acquiredAt`) }
  })
}

function normalizeSceneMemory(value: unknown): SceneMemoryRow[] {
  return rows(value).map((row, index) => {
    const item = record(row, `sceneMemory[${index}] must be an object`)
    if (typeof item.sceneId !== 'string') throw new TypeError(`sceneMemory[${index}].sceneId must be a string`)
    return {
      sceneId: item.sceneId,
      celebrationPhotoCreatedAt: item.celebrationPhotoCreatedAt === null || item.celebrationPhotoCreatedAt === undefined
        ? null
        : finiteTimestamp(item.celebrationPhotoCreatedAt, `sceneMemory[${index}].celebrationPhotoCreatedAt`),
    }
  })
}

/** 数据库升级、v1/v2/v3 JSON 导入和 v3 导出共用的唯一版本转换入口。 */
export function convertToV3Archive(value: unknown, context: MigrationContext): FarmArchiveV3 {
  const data = record(value, 'backup must be an object')
  const version = data.version
  if (version !== 1 && version !== 2 && version !== 3) throw new Error('未知的备份版本')

  const cards = normalizeCards(data.cards)
  let kv = asKvRows(data.kv)
  const meta = normalizeMeta(kvValue(kv, 'meta'), context.today)
  let farmState: FarmStateV3
  let chicks: PersistedChick[]

  if (version === 1) {
    const migrated = migrateV1Farm(kvValue(kv, 'farm'), meta.installDate, context)
    farmState = migrated.farmState
    chicks = migrated.chicks
    kv = kv.filter(row => row.key !== 'farm')
  } else {
    farmState = version === 2
      ? migrateFarmV2(kvValue(kv, 'farmState'))
      : migrateFarmV3(kvValue(kv, 'farmState'))
    chicks = rows(data.chicks).map((chick, index) => normalizeV3Chick(chick, index, version === 2))
  }

  kv = putKv(kv, 'farmState', farmState)
  kv = putKv(kv, 'meta', meta)
  kv = putKv(kv, 'settings', normalizeSettings(kvValue(kv, 'settings')))
  kv = putKv(kv, 'loadout', version === 3 ? normalizeLoadout(kvValue(kv, 'loadout')) : defaultCharacterLoadout())

  return {
    version: 3,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date(context.now).toISOString(),
    cards,
    sessions: rows(data.sessions),
    kv,
    chicks,
    seen: version === 1 ? seenRowsFromCards(cards) : rows(data.seen),
    rescue: rows(data.rescue),
    ink: rows(data.ink),
    decorations: version === 3 ? normalizeDecorations(data.decorations) : [],
    cosmetics: version === 3 ? normalizeCosmetics(data.cosmetics) : [],
    sceneMemory: version === 3 ? normalizeSceneMemory(data.sceneMemory) : [],
  }
}
