import { describe, expect, it } from 'vitest'
import { DEFAULT_NORMAL_CHICK_VARIANT_ID } from '../domain/farmCatalog'
import { exportAll, importAll } from './backup'
import { PipiDB } from './db'
import type { FarmStateV3 } from './farmPersistence'
import { V1_REAL_BACKUP, V2_REAL_BACKUP, V3_REAL_BACKUP } from './fixtures/legacyBackups'

let dbSequence = 0
const freshDb = () => new PipiDB(`pipitest-backup-${Date.now()}-${dbSequence++}`)

/**
 * 夹具里的待孵蛋按「当天」结算，必须钉死时钟：用真实时钟时，
 * 一旦跨过 2026-07-19，v1 的三颗待孵蛋会被当成已孵化，断言从 8 只变 11 只。
 */
const IMPORT_CLOCK = {
  now: new Date('2026-07-19T03:00:00.000Z').getTime(),
  today: '2026-07-19',
} as const

async function farmState(db: PipiDB): Promise<FarmStateV3> {
  return (await db.kv.get('farmState'))!.value as FarmStateV3
}

describe('v1/v2/v3 JSON 导入', () => {
  it('v1 使用共享转换：旧数字鸡和待孵蛋零损失进入 v3', async () => {
    const db = freshDb()
    await importAll(db, JSON.stringify(V1_REAL_BACKUP), IMPORT_CLOCK)

    expect(await db.chicks.count()).toBe(8)
    expect((await db.chicks.toArray()).every(chick => (
      chick.sceneId === 'scene-1'
      && chick.rarity === 'normal'
      && chick.variantId === DEFAULT_NORMAL_CHICK_VARIANT_ID
      && chick.favorite === false
    ))).toBe(true)
    const farm = await farmState(db)
    expect(farm.eggStock).toBe(2)
    expect(farm.incubating).toMatchObject({ rarity: 'normal', variantId: DEFAULT_NORMAL_CHICK_VARIANT_ID })
    expect(farm.eggStock + Number(farm.incubating !== null)).toBe(3)
    expect((await db.cards.get('apple'))!.card.due).toBeInstanceOf(Date)
    expect((await db.cards.get('apple'))!.card.last_review).toBeInstanceOf(Date)
    expect(await db.seen.get('apple')).toEqual({
      wordId: 'apple',
      lastSeenAt: new Date('2026-07-17T01:00:00.000Z').getTime(),
    })
    expect((await db.kv.get('meta'))!.value).toMatchObject({ totalDays: 35, streak: 9 })
    db.close()
  })

  it('v2 使用同一转换：三巢退款、学习记录及自定义 kv 全部保留', async () => {
    const db = freshDb()
    await importAll(db, JSON.stringify(V2_REAL_BACKUP), IMPORT_CLOCK)

    const farm = await farmState(db)
    expect(farm.eggStock).toBe(9)
    expect(farm.incubating?.placedAt).toBe(100)
    expect(farm.normalHatchStreak).toBe(0)
    expect(farm.nonSpecialHatchStreak).toBe(0)
    expect(await db.chicks.count()).toBe(2)
    expect(await db.sessions.get('2026-07-19')).toMatchObject({ completed: true, gameEggs: 4 })
    expect(await db.seen.get('apple')).toEqual(V2_REAL_BACKUP.seen[0])
    expect(await db.rescue.get('banana')).toEqual(V2_REAL_BACKUP.rescue[0])
    expect((await db.kv.get('lesson-progress:2026-07-19'))!.value).toEqual({ index: 3, phase: 'trace' })
    expect(await db.decorations.count()).toBe(0)
    expect(await db.cosmetics.count()).toBe(0)
    expect(await db.sceneMemory.count()).toBe(0)
    db.close()
  })

  it('v3 通过同一转换保持场景、隐藏外观、料理、保底和收藏资产', async () => {
    const db = freshDb()
    await importAll(db, JSON.stringify(V3_REAL_BACKUP), IMPORT_CLOCK)

    expect(await farmState(db)).toEqual(V3_REAL_BACKUP.kv[0].value)
    expect(await db.chicks.get('v3-special')).toMatchObject(V3_REAL_BACKUP.chicks[0])
    expect((await db.chicks.get('v3-special'))?.hatchedAt).toEqual(expect.any(Number))
    expect(await db.decorations.toArray()).toEqual(V3_REAL_BACKUP.decorations)
    expect(await db.cosmetics.toArray()).toEqual(V3_REAL_BACKUP.cosmetics)
    expect(await db.sceneMemory.toArray()).toEqual(V3_REAL_BACKUP.sceneMemory)
    expect((await db.kv.get('loadout'))!.value).toEqual(V3_REAL_BACKUP.kv[3].value)
    db.close()
  })
})

describe('v3 导出与原子恢复', () => {
  it('v3 导出再导入保留所有表、Date 与 Ink Blob', async () => {
    const source = freshDb()
    await importAll(source, JSON.stringify(V3_REAL_BACKUP), IMPORT_CLOCK)
    await source.ink.put({
      id: 'ink-1',
      wordId: 'apple',
      date: '2026-07-19',
      png: new Blob([Uint8Array.of(9, 8, 7, 6)], { type: 'image/png' }),
    })

    const json = await exportAll(source)
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(3)
    expect(parsed.ink[0].png).toMatchObject({ type: 'image/png' })
    expect(typeof parsed.ink[0].png.base64).toBe('string')

    const restored = freshDb()
    await importAll(restored, json, IMPORT_CLOCK)
    expect(await farmState(restored)).toEqual(await farmState(source))
    expect(await restored.chicks.toArray()).toEqual(await source.chicks.toArray())
    expect(await restored.sessions.toArray()).toEqual(await source.sessions.toArray())
    expect(await restored.seen.toArray()).toEqual(await source.seen.toArray())
    expect(await restored.rescue.toArray()).toEqual(await source.rescue.toArray())
    expect(await restored.decorations.toArray()).toEqual(await source.decorations.toArray())
    expect(await restored.cosmetics.toArray()).toEqual(await source.cosmetics.toArray())
    expect(await restored.sceneMemory.toArray()).toEqual(await source.sceneMemory.toArray())
    expect((await restored.cards.get('apple'))!.card.due).toBeInstanceOf(Date)
    const ink = await restored.ink.get('ink-1')
    expect(ink?.png.type).toBe('image/png')
    expect(Array.from(new Uint8Array(await ink!.png.arrayBuffer()))).toEqual([9, 8, 7, 6])
    source.close()
    restored.close()
  })

  it('导入写入阶段失败时恢复导入前的全部数据', async () => {
    const db = freshDb()
    await importAll(db, JSON.stringify(V3_REAL_BACKUP), IMPORT_CLOCK)
    const before = {
      cards: await db.cards.toArray(),
      sessions: await db.sessions.toArray(),
      kv: await db.kv.toArray(),
      chicks: await db.chicks.toArray(),
      decorations: await db.decorations.toArray(),
    }
    const invalid = structuredClone(V3_REAL_BACKUP) as unknown as Record<string, unknown>
    invalid.sessions = [{ completed: true }]

    await expect(importAll(db, JSON.stringify(invalid))).rejects.toThrow()
    expect(await db.cards.toArray()).toEqual(before.cards)
    expect(await db.sessions.toArray()).toEqual(before.sessions)
    expect(await db.kv.toArray()).toEqual(before.kv)
    expect(await db.chicks.toArray()).toEqual(before.chicks)
    expect(await db.decorations.toArray()).toEqual(before.decorations)
    db.close()
  })

  it('未知版本在清空数据库前拒绝', async () => {
    const db = freshDb()
    await importAll(db, JSON.stringify(V3_REAL_BACKUP), IMPORT_CLOCK)
    const before = await db.chicks.toArray()
    await expect(importAll(db, JSON.stringify({ version: 4 }))).rejects.toThrow('未知的备份版本')
    expect(await db.chicks.toArray()).toEqual(before)
    db.close()
  })
})
