// v1 → v2 迁移测试:用 v0.1 真实数据形状做夹具(fake-indexeddb)

import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { PipiDB, migrateFarmV1 } from './db'
import { dayKey, addDays } from '../domain/time'
import type { FarmState } from '../domain/types'

let dbSeq = 0
const uniqueName = () => `pipitest-mig-${Date.now()}-${dbSeq++}`

/** 按 v0.1 的 schema 与数据形状建一个 v1 库 */
async function seedV1(name: string) {
  const v1 = new Dexie(name)
  v1.version(1).stores({ cards: 'wordId, due', sessions: 'date', kv: 'key' })
  const today = dayKey()
  const yesterday = addDays(today, -1)
  const lastReview = new Date(Date.now() - 86400000)
  await v1.table('cards').bulkPut([
    { wordId: 'apple', due: Date.now(), card: { due: new Date(), last_review: lastReview, reps: 2 } },
    { wordId: 'banana', due: Date.now(), card: { due: new Date(), reps: 0 } }, // 无 last_review
  ])
  await v1.table('kv').bulkPut([
    { key: 'farm', value: { henName: '咕咕', chicks: 6, pendingEggs: [{ date: yesterday, n: 2 }, { date: today, n: 1 }] } },
    { key: 'meta', value: { streak: 3, lastDoneDate: yesterday, totalDays: 8 } },
  ])
  v1.close()
  return { today, yesterday, lastReview }
}

describe('Dexie v1 → v2 升级', () => {
  it('旧农场数据完整迁移:小鸡成行、昨日蛋直接孵化、今日蛋进巢位、旧 kv 移除', async () => {
    const name = uniqueName()
    const { yesterday, lastReview } = await seedV1(name)

    const db = new PipiDB(name)
    const chicks = await db.chicks.toArray()
    // 6 只存量 + 昨天 2 颗蛋直接孵化 = 8
    expect(chicks).toHaveLength(8)
    expect(chicks.every(c => c.source === 'migration' && c.homeX === null)).toBe(true)

    const farm = (await db.kv.get('farmState'))!.value as FarmState
    expect(farm.henName).toBe('咕咕')
    expect(farm.incubating).toHaveLength(1) // 今天的 1 颗
    expect(farm.eggStock).toBe(0)
    expect(farm.cooking).toBe('empty')
    expect(await db.kv.get('farm')).toBeUndefined()

    // meta 保留旧值并补 installDate
    const meta = (await db.kv.get('meta'))!.value as Record<string, unknown>
    expect(meta).toMatchObject({ streak: 3, lastDoneDate: yesterday, totalDays: 8 })
    expect(meta.installDate).toBeTruthy()

    // seen 由 last_review 初始化;无复习记录的词不建行
    const seen = await db.seen.toArray()
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ wordId: 'apple', lastSeenAt: lastReview.getTime() })
    db.close()
  })

  it('全新安装(无 v1 数据)直接得到 v2 空库', async () => {
    const db = new PipiDB(uniqueName())
    expect(await db.chicks.count()).toBe(0)
    expect(await db.kv.get('farm')).toBeUndefined()
    db.close()
  })
})

describe('migrateFarmV1(纯变换)', () => {
  it('今日蛋超过 3 巢位时,溢出进 eggStock(零资产损失)', () => {
    const today = '2026-07-17'
    const { farmState, chicks } = migrateFarmV1(
      { henName: '', chicks: 0, pendingEggs: [{ date: today, n: 5 }] },
      today, today, 1000,
    )
    expect(chicks).toHaveLength(0)
    expect(farmState.incubating).toHaveLength(3)
    expect(farmState.eggStock).toBe(2)
    expect(farmState.henName).toBeNull() // 空字符串归一为 null(→ first_visit)
  })
})
