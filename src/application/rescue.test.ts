import { describe, expect, it } from 'vitest'
import { PipiDB } from './db'
import { createRescueUsecases } from './usecases/rescue'
import { WORDS } from '../domain/words'
import { persistedChickWithDefaults } from './farmPersistence'

let dbSeq = 0
const freshDb = () => new PipiDB(`pipitest-rescue-${Date.now()}-${dbSeq++}`)

describe('救援用例', () => {
  it('旧记录从听开始、FIFO 且选项确定并不泄露英文', async () => {
    const db = freshDb()
    const rescue = createRescueUsecases(db)
    const [first, second] = WORDS
    await db.rescue.bulkPut([
      { wordId: second.id, capturedAt: 20, stage: 'trace' },
      { wordId: first.id, capturedAt: 10 },
    ])

    const vm1 = await rescue.loadViewModel()
    const vm2 = await rescue.loadViewModel()
    expect(vm1).toMatchObject({ empty: false, queueTotal: 2, stage: 'intro', stageIndex: 1 })
    expect(vm1.word?.id).toBe(first.id)
    expect(vm1.options).toEqual(vm2.options)
    expect(vm1.options).toHaveLength(4)
    expect(vm1.options.find(option => option.id === vm1.correctOptionId)?.label).toBe(first.meaning)
    for (const option of vm1.options) expect(option.id).toMatch(/^opt-\d$/)
    db.close()
  })

  it('阶段可断点恢复；答错不前进；最终原子删除并进入下一词', async () => {
    const db = freshDb()
    const rescue = createRescueUsecases(db)
    const [first, second] = WORDS
    const t0 = Date.now()
    await db.rescue.bulkPut([
      { wordId: first.id, capturedAt: t0 },
      { wordId: second.id, capturedAt: t0 + 1 },
    ])

    expect(await rescue.completePassiveStep('intro')).toBe(true)
    expect((await rescue.loadViewModel()).stage).toBe('trace')
    expect(await rescue.completePassiveStep('intro')).toBe(false)
    expect(await rescue.completePassiveStep('trace')).toBe(true)

    const choice = await rescue.loadViewModel()
    expect(choice.stage).toBe('choice')
    const wrong = choice.options.find(option => option.id !== choice.correctOptionId)!
    expect(await rescue.submitChoice(wrong.id)).toBe(false)
    expect((await rescue.loadViewModel()).stage).toBe('choice')
    expect(await rescue.submitChoice(choice.correctOptionId!)).toBe(true)
    expect((await rescue.loadViewModel()).stage).toBe('dictation')

    expect(await rescue.submitDictation('wrong')).toBe(false)
    expect(await db.rescue.get(first.id)).toMatchObject({ stage: 'dictation' })
    expect(await rescue.submitDictation(` ${first.word.toUpperCase()} `)).toBe(true)
    expect(await db.rescue.get(first.id)).toMatchObject({ stage: 'dictation' }) // 点继续前仍在队列
    expect(await rescue.confirmDictation(` ${first.word.toUpperCase()} `, t0 + 30)).toBe(true)
    expect(await db.rescue.get(first.id)).toBeUndefined()
    expect(await db.seen.get(first.id)).toEqual({ wordId: first.id, lastSeenAt: t0 + 30 })
    expect(await rescue.confirmDictation(first.word, t0 + 40)).toBe(false)

    const next = await rescue.loadViewModel()
    expect(next.word?.id).toBe(second.id)
    expect(next.stage).toBe('intro')
    db.close()
  })

  it('只更新 rescue 与 seen，不改变学习、农场和奖励数据', async () => {
    const db = freshDb()
    const rescue = createRescueUsecases(db)
    const word = WORDS[0]
    const t0 = Date.now()
    await db.rescue.put({ wordId: word.id, capturedAt: t0, stage: 'dictation' })
    await db.kv.bulkPut([
      { key: 'farmState', value: { henName: '咕咕', eggStock: 3, incubating: [], cooking: 'empty' } },
      { key: 'meta', value: { streak: 5, lastDoneDate: '2026-07-16', totalDays: 9, installDate: '2026-07-01' } },
    ])
    await db.sessions.put({
      date: '2026-07-17', reviewIds: [], newIds: [word.id], doneCount: 2,
      answered: 1, correct: 1, completed: false,
    })
    await db.chicks.put(persistedChickWithDefaults({ chickId: 'c1', bornOn: '2026-07-17', source: 'hatch', homeX: null, homeY: null }))
    const before = {
      kv: await db.kv.toArray(),
      sessions: await db.sessions.toArray(),
      cards: await db.cards.toArray(),
      chicks: await db.chicks.toArray(),
    }

    expect(await rescue.submitDictation(word.word)).toBe(true)
    expect(await rescue.confirmDictation(word.word, t0 + 1)).toBe(true)
    expect(await db.kv.toArray()).toEqual(before.kv)
    expect(await db.sessions.toArray()).toEqual(before.sessions)
    expect(await db.cards.toArray()).toEqual(before.cards)
    expect(await db.chicks.toArray()).toEqual(before.chicks)
    db.close()
  })
})
