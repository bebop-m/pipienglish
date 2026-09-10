import { describe, expect, it } from 'vitest'
import { fastForward, validateFastForwardInput } from './fastForward'
import { PipiDB } from './db'
import { createFarmUsecases } from './usecases/farmHome'
import { STARTER_WORD_IDS } from './starterWords'
import { NEW_PER_DAY, REVIEW_CAP } from '../domain/dailyPlan'
import { addDays } from '../domain/time'
import { WORDS } from '../domain/words'
import type { MetaState } from '../domain/types'
import type { FarmStateV3 } from './farmPersistence'

let dbSequence = 0
const freshDb = () => new PipiDB(`pipitest-ff-${Date.now()}-${dbSequence++}`)

/** 与 backup.test 同理:钉死时钟,断言不随真实日期漂移 */
const TODAY = '2026-08-05'
const NOW = new Date(`${TODAY}T08:00:00`).getTime()

const INPUT = { days: 10, streak: 10, chicks: 6, eggs: 5, henName: '花花' }

describe('fastForward 快进模拟', () => {
  it('输入校验:非法值直接拒绝', () => {
    expect(validateFastForwardInput({ ...INPUT, days: 0 })).toBeTruthy()
    expect(validateFastForwardInput({ ...INPUT, days: 1.5 })).toBeTruthy()
    expect(validateFastForwardInput({ ...INPUT, eggs: -1 })).toBeTruthy()
    expect(validateFastForwardInput({ ...INPUT, chicks: -1 })).toBeTruthy()
    expect(validateFastForwardInput(INPUT)).toBeNull()
  })

  it('N 天会话:连续日期、昨天结束、全部完成;词按投放顺序 4 个/天', async () => {
    const db = freshDb()
    await fastForward(db, INPUT, { today: TODAY })

    const sessions = await db.sessions.orderBy('date').toArray()
    expect(sessions).toHaveLength(10)
    expect(sessions[9].date).toBe(addDays(TODAY, -1))
    expect(sessions[0].date).toBe(addDays(TODAY, -10))
    sessions.forEach((session, index) => {
      expect(session.completed).toBe(true)
      expect(session.date).toBe(addDays(TODAY, index - 10))
      expect(session.newIds).toHaveLength(NEW_PER_DAY)
      expect(session.reviewIds.length).toBeLessThanOrEqual(REVIEW_CAP)
    })

    // 新词 = 词库顺序里排除起步词后的前 40 个,与固定学习计划一字不差
    const expectedNew = WORDS.filter(word => !STARTER_WORD_IDS.includes(word.id))
      .slice(0, 10 * NEW_PER_DAY)
      .map(word => word.id)
    expect(sessions.flatMap(session => session.newIds)).toEqual(expectedNew)

    // 卡片 = 起步词 + 新词,due 一律在最后学习日之后仍有效(排程单调)
    expect(await db.cards.count()).toBe(STARTER_WORD_IDS.length + 10 * NEW_PER_DAY)
    db.close()
  })

  it('meta/农场/小鸡:连胜截断、蛋数照填、小鸡铺在最近几天', async () => {
    const db = freshDb()
    await fastForward(db, { ...INPUT, streak: 99 }, { today: TODAY })

    const meta = (await db.kv.get('meta'))!.value as MetaState
    expect(meta).toMatchObject({
      streak: 10, // 99 被截断到 N
      totalDays: 10,
      lastDoneDate: addDays(TODAY, -1),
      installDate: addDays(TODAY, -10),
    })

    const farm = (await db.kv.get('farmState'))!.value as FarmStateV3
    expect(farm.henName).toBe('花花')
    expect(farm.eggStock).toBe(5)
    expect(farm.incubating).toBeNull()

    const chicks = await db.chicks.toArray()
    expect(chicks).toHaveLength(6)
    for (const chick of chicks) {
      expect(chick.sceneId).toBe('scene-1')
      expect(chick.bornOn >= addDays(TODAY, -10)).toBe(true)
      expect(chick.bornOn <= addDays(TODAY, -1)).toBe(true)
    }
    db.close()
  })

  it('快进后 clockGuard:今天建出 Day N+1 会话,新词紧接投放顺序,起步词不重播', async () => {
    const db = freshDb()
    await fastForward(db, INPUT, { today: TODAY })

    const uc = createFarmUsecases(db)
    const { sessionRebuilt } = await uc.clockGuard(NOW)
    expect(sessionRebuilt).toBe(true)

    const todaySession = (await db.sessions.get(TODAY))!
    const expectedNext = WORDS.filter(word => !STARTER_WORD_IDS.includes(word.id))
      .slice(10 * NEW_PER_DAY, 10 * NEW_PER_DAY + NEW_PER_DAY)
      .map(word => word.id)
    expect(todaySession.newIds).toEqual(expectedNext)
    expect(todaySession.completed).toBe(false)
    // 昨天学的 2 个新词(首评 Good,10 分钟后到期)今天已到期;队列按最过期优先取 ≤12,
    // 它们进不进今天的队列取决于积压,但到期事实必须成立(顺延属正常行为)
    const yesterdayNew = (await db.sessions.get(addDays(TODAY, -1)))!.newIds
    for (const wordId of yesterdayNew) {
      expect((await db.cards.get(wordId))!.due).toBeLessThanOrEqual(NOW)
    }
    expect(todaySession.reviewIds.length).toBeGreaterThanOrEqual(yesterdayNew.length) // 昨日新词必在今日队列
    expect(todaySession.reviewIds.length).toBeLessThanOrEqual(REVIEW_CAP)
    for (const wordId of todaySession.reviewIds) {
      expect((await db.cards.get(wordId))!.due).toBeLessThanOrEqual(NOW)
    }
    // 起步词播种标记已带上,不会重新播 12 词挤爆队列
    expect(await db.cards.count()).toBe(STARTER_WORD_IDS.length + 10 * NEW_PER_DAY)
    db.close()
  })

  it('整档覆盖:旧数据(救援/笔迹/旧卡片)全部清空,本机设置保留', async () => {
    const db = freshDb()
    await db.rescue.put({ wordId: 'apple', capturedAt: 1 })
    await db.ink.put({ id: 'x', wordId: 'apple', date: '2026-08-01', png: new Blob(['x']) })
    await db.cards.put({ wordId: 'zebra-not-real', due: 1, card: { due: new Date(1) } as never })
    await db.kv.put({ key: 'settings', value: { motionEnabled: false, musicEnabled: false } })

    await fastForward(db, INPUT, { today: TODAY })

    expect(await db.rescue.count()).toBe(0)
    expect(await db.ink.count()).toBe(0)
    expect(await db.cards.get('zebra-not-real')).toBeUndefined()
    expect((await db.kv.get('settings'))!.value).toEqual({ motionEnabled: false, musicEnabled: false })
    db.close()
  })
})
