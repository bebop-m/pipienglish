// 写词游戏用例测试(fake-indexeddb):解锁门槛 / 陈旧度抽词 / 不写 FSRS / 救援 / 煎蛋奖励

import { describe, expect, it } from 'vitest'
import { PipiDB } from './db'
import { createFarmUsecases } from './usecases/farmHome'
import { createHandwritingUsecases, HANDWRITING_ROUND_SIZE } from './usecases/handwriting'
import { getKV, DEFAULT_FARM } from './db'
import { mulberry32 } from '../domain/lesson'
import { newCard, rate } from '../domain/srs'
import type { FarmState } from '../domain/types'

let dbSeq = 0
const freshDb = () => new PipiDB(`pipitest-hw-${Date.now()}-${dbSeq++}`)

const DAY_MS = 24 * 60 * 60 * 1000

/** 造 n 个已学词(有 FSRS 卡),lastSeenAt 可控 */
async function seedLearned(db: PipiDB, wordIds: string[], seenAt: (id: string) => number) {
  for (const wordId of wordIds) {
    const card = rate(newCard(), true)
    await db.cards.put({ wordId, due: card.due.getTime(), card })
    await db.seen.put({ wordId, lastSeenAt: seenAt(wordId) })
  }
}

async function completedToday(db: PipiDB, now: number) {
  const farm = createFarmUsecases(db)
  await farm.clockGuard(now)
  await farm.nameHen('咕咕')
  await farm.completeDailyLesson(now)
  return farm
}

describe('写词游戏用例', () => {
  it('未完成今日必修 → 不解锁,抽不到题(数据侧防线)', async () => {
    const db = freshDb()
    const uc = createHandwritingUsecases(db)
    const now = Date.now()
    await createFarmUsecases(db).clockGuard(now)
    await seedLearned(db, ['apple', 'banana'], () => now)
    expect(await uc.unlockedToday(now)).toBe(false)
    expect(await uc.buildRound(now)).toEqual([])
    db.close()
  })

  it('抽题:只抽已学词、不放回、≤10 题;词少时整池出题', async () => {
    const db = freshDb()
    const now = Date.now()
    await db.kv.put({ key: 'starterWordsSeeded', value: 0 }) // 屏蔽起步词播种,构造 5 词小池
    await completedToday(db, now)
    const learned = ['apple', 'banana', 'orange', 'grape', 'peach']
    await seedLearned(db, learned, () => now)
    const uc = createHandwritingUsecases(db)

    const round = await uc.buildRound(now, mulberry32(1))
    expect(round).toHaveLength(5) // 池子只有 5 个 → 整池
    expect(new Set(round).size).toBe(5) // 不放回
    for (const id of round) expect(learned).toContain(id) // 只抽已学
    db.close()
  })

  it('抽题:超过 10 个已学词时取 10;久未谋面的词显著优先(陈旧度加权)', async () => {
    const db = freshDb()
    const now = Date.now()
    await completedToday(db, now)
    const ids = ['apple', 'banana', 'orange', 'grape', 'peach', 'pear', 'lemon', 'mango', 'cherry', 'kiwi', 'melon', 'rice', 'bread', 'cake']
    // stale:apple/rice 三十天没见;其余今天刚见过
    await seedLearned(db, ids, id => (id === 'apple' || id === 'rice' ? now - 30 * DAY_MS : now))
    const uc = createHandwritingUsecases(db)

    const round = await uc.buildRound(now, mulberry32(7))
    expect(round).toHaveLength(HANDWRITING_ROUND_SIZE)
    expect(round).toContain('apple') // (30+1)² ≈ 权重 961 倍于刚见过的词
    expect(round).toContain('rice')
    db.close()
  })

  it('写对:只更新见面时间,FSRS 卡纹丝不动(游戏不入排程)', async () => {
    const db = freshDb()
    const now = Date.now()
    await completedToday(db, now)
    await seedLearned(db, ['apple'], () => now - DAY_MS)
    const uc = createHandwritingUsecases(db)

    const before = (await db.cards.get('apple'))!
    await uc.recordCorrect('apple', now)
    const after = (await db.cards.get('apple'))!
    expect(after.due).toBe(before.due)
    expect(after.card).toEqual(before.card)
    expect((await db.seen.get('apple'))!.lastSeenAt).toBe(now)
    db.close()
  })

  it('想不起来:进救援(小鸡被抓)+ 见面时间;仍不写 FSRS', async () => {
    const db = freshDb()
    const now = Date.now()
    await completedToday(db, now)
    await seedLearned(db, ['banana'], () => now - DAY_MS)
    const uc = createHandwritingUsecases(db)

    const before = (await db.cards.get('banana'))!
    await uc.recordForgot('banana', now)
    expect(await db.rescue.get('banana')).toMatchObject({ wordId: 'banana', capturedAt: now })
    expect((await db.cards.get('banana'))!.due).toBe(before.due)
    db.close()
  })

  it('奖励(蛋经济 v2):每轮鸡蛋 +1 进库存,每日上限 5,超出返回 capped 且不加蛋', async () => {
    const db = freshDb()
    const now = Date.now()
    await completedToday(db, now) // 完成必修 → eggStock 1(固定 1 颗)
    const uc = createHandwritingUsecases(db)

    for (let i = 1; i <= 5; i++) {
      expect(await uc.awardRound(now)).toBe('egg')
      expect(await uc.gameEggsToday(now)).toBe(i)
    }
    let state = await getKV<FarmState>(db, 'farmState', DEFAULT_FARM)
    expect(state.eggStock).toBe(1 + 5) // 必修 1 + 游戏 5

    expect(await uc.awardRound(now)).toBe('capped') // 第 6 轮:照常可玩,不发蛋
    state = await getKV<FarmState>(db, 'farmState', DEFAULT_FARM)
    expect(state.eggStock).toBe(6)
    expect(await uc.gameEggsToday(now)).toBe(5)
    db.close()
  })

  it('奖励计数跨日清零(记在当日会话行)', async () => {
    const db = freshDb()
    const now = Date.now()
    const farm = await completedToday(db, now)
    const uc = createHandwritingUsecases(db)
    await uc.awardRound(now)
    expect(await uc.gameEggsToday(now)).toBe(1)

    const t1 = now + DAY_MS
    await farm.clockGuard(t1) // 翻日重建会话
    expect(await uc.gameEggsToday(t1)).toBe(0)
    db.close()
  })

  it('必修完成固定 1 颗蛋(满任务日也不再是 2 颗)', async () => {
    const db = freshDb()
    const now = Date.now()
    await completedToday(db, now)
    const state = await getKV<FarmState>(db, 'farmState', DEFAULT_FARM)
    expect(state.eggStock).toBe(1)
    db.close()
  })
})
