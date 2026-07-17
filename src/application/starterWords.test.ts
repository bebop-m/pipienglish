// 起步词播种测试:一次性 / 不覆盖真实记录 / 不进新词队列 / 当晚可玩默写游戏

import { describe, expect, it } from 'vitest'
import { PipiDB } from './db'
import { createFarmUsecases } from './usecases/farmHome'
import { createHandwritingUsecases } from './usecases/handwriting'
import { ensureStarterWords, STARTER_WORD_IDS } from './starterWords'
import { mulberry32 } from '../domain/lesson'
import { newCard, rate } from '../domain/srs'
import { dayKeyOf } from '../domain/time'
import { WORD_MAP } from '../domain/words'

let dbSeq = 0
const freshDb = () => new PipiDB(`pipitest-seed-${Date.now()}-${dbSeq++}`)

describe('起步词播种', () => {
  it('12 个起步词全部在词库中', () => {
    for (const id of STARTER_WORD_IDS) expect(WORD_MAP.has(id), id).toBe(true)
  })

  it('首次播种写卡 + seen;再次调用幂等零写入', async () => {
    const db = freshDb()
    const now = Date.now()
    expect(await ensureStarterWords(db, now)).toBe(12)
    expect(await db.cards.count()).toBe(12)
    expect(await db.seen.count()).toBe(12)
    expect(await ensureStarterWords(db, now)).toBe(0) // 标记后不再播
    db.close()
  })

  it('已有真实学习记录的词不被覆盖', async () => {
    const db = freshDb()
    const now = Date.now()
    const real = rate(newCard(), false) // 一条"真实"的 Again 记录
    await db.cards.put({ wordId: 'apple', due: real.due.getTime(), card: real })
    await ensureStarterWords(db, now)
    expect((await db.cards.get('apple'))!.card.lapses).toBe(real.lapses) // 原记录原样
    expect(await db.cards.count()).toBe(12)
    db.close()
  })

  it('clockGuard 自动播种且先于建会话:起步词不进今日新词队列', async () => {
    const db = freshDb()
    const now = Date.now()
    const farm = createFarmUsecases(db)
    await farm.clockGuard(now)
    const session = (await db.sessions.get(dayKeyOf(now)))!
    for (const id of session.newIds) expect(STARTER_WORD_IDS).not.toContain(id)
    expect(session.newIds).toHaveLength(4) // 新词照常从未学词里取
    db.close()
  })

  it('当晚闭环:完成必修后即可抽满 10 题默写(池 = 12 起步 + 今日已学)', async () => {
    const db = freshDb()
    const now = Date.now()
    const farm = createFarmUsecases(db)
    await farm.clockGuard(now)
    await farm.nameHen('咕咕')
    await farm.completeDailyLesson(now)
    const uc = createHandwritingUsecases(db)
    const round = await uc.buildRound(now, mulberry32(3))
    expect(round).toHaveLength(10)
    for (const id of round) expect(WORD_MAP.has(id)).toBe(true)
    db.close()
  })
})
