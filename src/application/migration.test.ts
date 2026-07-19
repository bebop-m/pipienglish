import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_XIAOPI_HEAD_LOOK_ID,
  DEFAULT_XIAOPI_OUTFIT_ID,
  DEFAULT_NORMAL_CHICK_VARIANT_ID,
  type CharacterLoadout,
} from '../domain/farmCatalog'
import { addDays, dayKey } from '../domain/time'
import { PipiDB } from './db'
import type { FarmStateV3 } from './farmPersistence'
import { V2_REAL_BACKUP } from './fixtures/legacyBackups'

let dbSequence = 0
const uniqueName = () => `pipitest-mig-${Date.now()}-${dbSequence++}`

const V2_STORES = {
  cards: 'wordId, due',
  sessions: 'date',
  kv: 'key',
  chicks: 'chickId, bornOn',
  seen: 'wordId, lastSeenAt',
  rescue: 'wordId, capturedAt',
  ink: 'id, wordId, date',
}

async function seedV1(name: string) {
  const legacy = new Dexie(name)
  legacy.version(1).stores({ cards: 'wordId, due', sessions: 'date', kv: 'key' })
  const today = dayKey()
  const yesterday = addDays(today, -1)
  const lastReview = new Date(Date.now() - 86_400_000)
  await legacy.table('cards').bulkPut([
    { wordId: 'apple', due: Date.now(), card: { due: new Date(), last_review: lastReview, reps: 2 } },
    { wordId: 'banana', due: Date.now(), card: { due: new Date(), reps: 0 } },
  ])
  await legacy.table('kv').bulkPut([
    { key: 'farm', value: { henName: '咕咕', chicks: 6, pendingEggs: [{ date: yesterday, n: 2 }, { date: today, n: 1 }] } },
    { key: 'meta', value: { streak: 3, lastDoneDate: yesterday, totalDays: 8 } },
  ])
  legacy.close()
  return { yesterday, lastReview }
}

async function seedV2(name: string, farmOverride?: Record<string, unknown>) {
  const legacy = new Dexie(name)
  legacy.version(2).stores(V2_STORES)
  const cards = V2_REAL_BACKUP.cards.map(row => ({
    ...row,
    card: {
      ...row.card,
      due: new Date(row.card.due),
      last_review: new Date(row.card.last_review),
    },
  }))
  const kv: Array<{ key: string; value: Record<string, unknown> }> = V2_REAL_BACKUP.kv.map(row => ({
    key: row.key,
    value: structuredClone(row.value) as Record<string, unknown>,
  }))
  if (farmOverride) {
    const farm = kv.find(row => row.key === 'farmState')!
    farm.value = { ...farm.value, ...farmOverride }
  }
  await Promise.all([
    legacy.table('cards').bulkPut(cards),
    legacy.table('sessions').bulkPut(structuredClone(V2_REAL_BACKUP.sessions)),
    legacy.table('kv').bulkPut(kv),
    legacy.table('chicks').bulkPut(structuredClone(V2_REAL_BACKUP.chicks)),
    legacy.table('seen').bulkPut(structuredClone(V2_REAL_BACKUP.seen)),
    legacy.table('rescue').bulkPut(structuredClone(V2_REAL_BACKUP.rescue)),
    legacy.table('ink').put({
      id: 'ink-apple-1',
      wordId: 'apple',
      date: '2026-07-19',
      png: new Blob([Uint8Array.of(1, 2, 3)], { type: 'image/png' }),
    }),
  ])
  const snapshot = {
    cards: await legacy.table('cards').toArray(),
    sessions: await legacy.table('sessions').toArray(),
    seen: await legacy.table('seen').toArray(),
    rescue: await legacy.table('rescue').toArray(),
    ink: await legacy.table('ink').toArray(),
    kv,
  }
  legacy.close()
  return snapshot
}

describe('Dexie v3 数据库升级', () => {
  it('v1 数据顺序升级到 v3，鸡、蛋、完成日和见面记录零损失', async () => {
    const name = uniqueName()
    const { yesterday, lastReview } = await seedV1(name)
    const db = new PipiDB(name)

    const chicks = await db.chicks.toArray()
    expect(chicks).toHaveLength(8)
    expect(chicks.every(chick => chick.sceneId === 'scene-1')).toBe(true)
    expect(chicks.every(chick => chick.rarity === 'normal')).toBe(true)
    expect(chicks.every(chick => chick.variantId === DEFAULT_NORMAL_CHICK_VARIANT_ID)).toBe(true)
    expect(chicks.every(chick => chick.favorite === false)).toBe(true)

    const farm = (await db.kv.get('farmState'))!.value as FarmStateV3
    expect(farm).toMatchObject({
      henName: '咕咕',
      eggStock: 0,
      activeSceneId: 'scene-1',
      acknowledgedSceneChapter: 1,
      normalHatchStreak: 0,
      nonSpecialHatchStreak: 0,
      cookingMeal: null,
    })
    expect(farm.incubating).toMatchObject({ rarity: 'normal', variantId: DEFAULT_NORMAL_CHICK_VARIANT_ID })
    expect((await db.kv.get('meta'))!.value).toMatchObject({ streak: 3, lastDoneDate: yesterday, totalDays: 8 })
    expect(await db.seen.toArray()).toEqual([{ wordId: 'apple', lastSeenAt: lastReview.getTime() }])
    expect(await db.kv.get('farm')).toBeUndefined()
    db.close()
  })

  it('v2 三巢只保留 placedAt 最早一颗，其余逐颗退款且不推进保底', async () => {
    const name = uniqueName()
    const before = await seedV2(name)
    const db = new PipiDB(name)

    const farm = (await db.kv.get('farmState'))!.value as FarmStateV3
    expect(farm.eggStock).toBe(9)
    expect(farm.incubating).toEqual({
      placedAt: 100,
      rarity: 'normal',
      variantId: DEFAULT_NORMAL_CHICK_VARIANT_ID,
    })
    expect(farm.normalHatchStreak).toBe(0)
    expect(farm.nonSpecialHatchStreak).toBe(0)
    expect(farm.cookingMeal).toBeNull()
    expect(farm.eggStock + Number(farm.incubating !== null)).toBe(10)

    const chicks = await db.chicks.orderBy('bornOn').toArray()
    expect(chicks).toHaveLength(2)
    expect(chicks.every(chick => chick.sceneId === 'scene-1')).toBe(true)
    expect(chicks.every(chick => chick.rarity === 'normal' && chick.favorite === false)).toBe(true)
    expect(await db.chicks.where('sceneId').equals('scene-1').count()).toBe(2)

    const meta = (await db.kv.get('meta'))!.value as Record<string, unknown>
    expect(meta.totalDays).toBe(72)
    expect(await db.cards.toArray()).toEqual(before.cards)
    expect(await db.sessions.toArray()).toEqual(before.sessions)
    expect(await db.seen.toArray()).toEqual(before.seen)
    expect(await db.rescue.toArray()).toEqual(before.rescue)
    const migratedInk = await db.ink.get('ink-apple-1')
    expect(Array.from(new Uint8Array(await migratedInk!.png.arrayBuffer()))).toEqual([1, 2, 3])

    const loadout = (await db.kv.get('loadout'))!.value as CharacterLoadout
    expect(loadout.xiaopi).toMatchObject({
      headLook: DEFAULT_XIAOPI_HEAD_LOOK_ID,
      outfit: DEFAULT_XIAOPI_OUTFIT_ID,
      accessory: null,
    })
    expect(await db.decorations.count()).toBe(0)
    expect(await db.cosmetics.count()).toBe(0)
    expect(await db.sceneMemory.count()).toBe(0)
    db.close()
  })

  it('升级事务失败会整体回滚到原 v2 数据', async () => {
    const name = uniqueName()
    const before = await seedV2(name, { eggStock: -1 })
    const db = new PipiDB(name)
    await expect(db.open()).rejects.toThrow('farmState.eggStock')
    db.close()

    const legacy = new Dexie(name)
    legacy.version(2).stores(V2_STORES)
    await legacy.open()
    expect((await legacy.table('kv').toArray()).sort((left, right) => left.key.localeCompare(right.key)))
      .toEqual([...before.kv].sort((left, right) => left.key.localeCompare(right.key)))
    expect(await legacy.table('cards').toArray()).toEqual(before.cards)
    expect(await legacy.table('sessions').toArray()).toEqual(before.sessions)
    expect(await legacy.table('chicks').count()).toBe(2)
    expect(legacy.tables.map(table => table.name)).not.toContain('decorations')
    legacy.close()
  })

  it('全新 v3 库原子初始化场景、计数器、料理和 CharacterLoadout', async () => {
    const db = new PipiDB(uniqueName())
    const farm = (await db.kv.get('farmState'))!.value as FarmStateV3
    expect(farm).toEqual({
      henName: null,
      eggStock: 0,
      incubating: null,
      cookingMeal: null,
      activeSceneId: 'scene-1',
      acknowledgedSceneChapter: 1,
      normalHatchStreak: 0,
      nonSpecialHatchStreak: 0,
    })
    expect((await db.kv.get('loadout'))!.value).toEqual({
      xiaopi: {
        headLook: DEFAULT_XIAOPI_HEAD_LOOK_ID,
        outfit: DEFAULT_XIAOPI_OUTFIT_ID,
        accessory: null,
      },
      mother: { headwear: null, neckwear: null },
    })
    db.close()
  })
})
