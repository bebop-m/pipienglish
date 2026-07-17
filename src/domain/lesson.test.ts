// 学习流规则单测:题型分配 / 热身排序 / 确定性 / 选项 / 原地重试归约 / 想不起来 / 完成

import { describe, expect, it } from 'vitest'
import {
  applyLessonEvent,
  assignReviewTypes,
  buildLessonPlan,
  buildOptions,
  lessonFinished,
  mulberry32,
  newLessonProgress,
  seedOf,
  type LessonEffect,
  type LessonProgress,
  type LessonStep,
} from './lesson'
import { WORDS, WORD_MAP } from './words'

const planInput = {
  date: '2026-07-17',
  reviewCards: [
    { wordId: 'apple', stability: 12 },
    { wordId: 'banana', stability: 2, lastQuizType: 'choice' as const },
    { wordId: 'orange', stability: 9 },
    { wordId: 'grape', stability: 1 },
    { wordId: 'peach', stability: 20 },
    { wordId: 'pear', stability: 8 },
  ],
  newIds: ['cat', 'dog', 'bird', 'hen'],
}

const fx = (effects: LessonEffect[], type: LessonEffect['type']) => effects.filter(e => e.type === type)

/** 按当前步类型走一步(全对) */
function passStep(p: LessonProgress): { progress: LessonProgress; effects: LessonEffect[] } {
  const step = p.steps[p.cursor]
  if (step.type === 'intro' || step.type === 'trace') return applyLessonEvent(p, { type: 'STEP_DONE' })
  return applyLessonEvent(p, { type: 'ANSWER', correct: true })
}

describe('复习题型分配(SPEC §5.2/§5.3)', () => {
  it('stability≥7 → 默写,每日上限 3,超出降级选择题', () => {
    const types = assignReviewTypes(planInput.reviewCards)
    // 最过期优先顺序里前 3 个熟卡拿到默写:apple(12)、orange(9)、peach(20)
    expect(types.get('apple')).toBe('dictation')
    expect(types.get('orange')).toBe('dictation')
    expect(types.get('peach')).toBe('dictation')
    expect(types.get('pear')).toBe('choice') // 第 4 张熟卡降级
  })

  it('生卡选择/听音交替:上次 choice → 这次 listening;无记录 → choice', () => {
    const types = assignReviewTypes(planInput.reviewCards)
    expect(types.get('banana')).toBe('listening')
    expect(types.get('grape')).toBe('choice')
  })
})

describe('课程计划构建', () => {
  const plan = buildLessonPlan(planInput, WORD_MAP, WORDS)

  it('结构:6 复习 → 4×(听看/描红/选择) → 4 收尾默写', () => {
    expect(plan).toHaveLength(6 + 4 * 3 + 4)
    expect(plan.slice(0, 6).every(s => s.phase === 'review')).toBe(true)
    expect(plan.slice(6, 18).map(s => s.type)).toEqual(
      ['intro', 'trace', 'choice', 'intro', 'trace', 'choice', 'intro', 'trace', 'choice', 'intro', 'trace', 'choice'],
    )
    expect(plan.slice(18).every(s => s.type === 'closing' && !s.scored)).toBe(true)
  })

  it('热身:前 3 张按记忆强度降序(peach 20 → apple 12 → orange 9)', () => {
    expect(plan.slice(0, 3).map(s => s.wordId)).toEqual(['peach', 'apple', 'orange'])
  })

  it('确定性:同日重建计划完全一致(断点恢复的前提)', () => {
    expect(buildLessonPlan(planInput, WORD_MAP, WORDS)).toEqual(plan)
    expect(seedOf('lesson:2026-07-17')).toBe(seedOf('lesson:2026-07-17'))
  })

  it('选择题选项:4 个、含正确释义、无重复', () => {
    for (const step of plan.filter(s => s.options)) {
      const word = WORD_MAP.get(step.wordId)!
      expect(step.options).toHaveLength(4)
      expect(step.options).toContain(word.meaning)
      expect(new Set(step.options).size).toBe(4)
    }
  })

  it('干扰项优先同包同级', () => {
    const rng = mulberry32(42)
    const options = buildOptions(WORD_MAP.get('cat')!, WORDS, rng)
    const others = options.filter(m => m !== '猫')
    for (const meaning of others) {
      const source = WORDS.find(w => w.meaning === meaning && w.pack === '动物朋友')
      expect(source, `${meaning} 应来自同包`).toBeTruthy()
    }
  })
})

describe('事件归约与原地重试', () => {
  const plan = buildLessonPlan(planInput, WORD_MAP, WORDS)

  it('全对走完:PROGRESS 恰好 = 复习6 + 新词4×2;最后一步发 COMPLETED', () => {
    let p = newLessonProgress('2026-07-17', plan)
    let progressCount = 0
    let completedCount = 0
    while (!lessonFinished(p)) {
      const r = passStep(p)
      progressCount += fx(r.effects, 'PROGRESS').length
      completedCount += fx(r.effects, 'COMPLETED').length
      p = r.progress
    }
    expect(progressCount).toBe(6 + 4 * 2)
    expect(completedCount).toBe(1)
    expect(p.answered).toBe(6 + 4) // 6 复习 + 4 新词自测(收尾不计)
    expect(p.correct).toBe(10)
    expect(p.steps).toHaveLength(plan.length) // 原地重试:不追加步骤
  })

  it('答错:首次记 Again、cursor 不动(原地重试);再答对不再写 FSRS、播音并前进', () => {
    let p = newLessonProgress('2026-07-17', plan)
    const first = p.steps[0] // 热身第一张:peach 默写
    expect(first.type).toBe('dictation')

    const r1 = applyLessonEvent(p, { type: 'ANSWER', correct: false })
    expect(fx(r1.effects, 'RATE')).toEqual([{ type: 'RATE', wordId: first.wordId, know: false, quizKind: undefined }])
    expect(fx(r1.effects, 'PLAY_WORD')).toEqual([]) // 答错不播
    expect(fx(r1.effects, 'PROGRESS')).toEqual([]) // 未通过不推进度
    expect(r1.progress.cursor).toBe(0) // 留在本题
    expect(r1.progress.steps[0].attempted).toBe(true)
    p = r1.progress

    const r2 = applyLessonEvent(p, { type: 'ANSWER', correct: false }) // 再错一次
    expect(fx(r2.effects, 'RATE')).toEqual([]) // 每词每日只评一次
    expect(r2.progress.cursor).toBe(0)
    p = r2.progress

    const r3 = applyLessonEvent(p, { type: 'ANSWER', correct: true })
    expect(fx(r3.effects, 'RATE')).toEqual([]) // Again 定调不被 Good 覆盖
    expect(fx(r3.effects, 'PLAY_WORD')).toHaveLength(1) // 写对即播
    expect(fx(r3.effects, 'PROGRESS')).toHaveLength(1)
    expect(r3.progress.cursor).toBe(1)
    expect(r3.progress.answered).toBe(3)
    expect(r3.progress.correct).toBe(1)
  })

  it('选择题答对首试:记 Good + lastQuizType', () => {
    let p = newLessonProgress('2026-07-17', plan)
    while (p.steps[p.cursor].type !== 'choice') p = passStep(p).progress
    const step = p.steps[p.cursor]
    const r = applyLessonEvent(p, { type: 'ANSWER', correct: true })
    expect(fx(r.effects, 'RATE')).toEqual([{ type: 'RATE', wordId: step.wordId, know: true, quizKind: 'choice' }])
  })

  it('想不起来(默写复习):Again + 救援 + 跳过前进(H-5D 小鸡被抓)', () => {
    let p = newLessonProgress('2026-07-17', plan)
    const step = p.steps[0]
    const r = applyLessonEvent(p, { type: 'FORGOT' })
    expect(fx(r.effects, 'RATE')).toEqual([{ type: 'RATE', wordId: step.wordId, know: false, quizKind: undefined }])
    expect(fx(r.effects, 'RESCUE')).toEqual([{ type: 'RESCUE', wordId: step.wordId }])
    expect(fx(r.effects, 'PROGRESS')).toHaveLength(1) // 该步已消费,今日进度照常推进
    expect(r.progress.cursor).toBe(1)
    expect(r.progress.forgotten).toEqual([step.wordId])
  })

  it('先答错再想不起来:不重复记 Again,仍救援并前进', () => {
    let p = newLessonProgress('2026-07-17', plan)
    p = applyLessonEvent(p, { type: 'ANSWER', correct: false }).progress // 首错已记 Again
    const r = applyLessonEvent(p, { type: 'FORGOT' })
    expect(fx(r.effects, 'RATE')).toEqual([])
    expect(fx(r.effects, 'RESCUE')).toHaveLength(1)
    expect(r.progress.cursor).toBe(1)
  })

  it('想不起来(收尾默写):只救援,不计分不写 FSRS', () => {
    let p = newLessonProgress('2026-07-17', plan)
    while (p.steps[p.cursor].type !== 'closing') p = passStep(p).progress
    const step = p.steps[p.cursor]
    const before = p.answered
    const r = applyLessonEvent(p, { type: 'FORGOT' })
    expect(fx(r.effects, 'RATE')).toEqual([])
    expect(fx(r.effects, 'ANSWERED')).toEqual([])
    expect(fx(r.effects, 'RESCUE')).toEqual([{ type: 'RESCUE', wordId: step.wordId }])
    expect(r.progress.answered).toBe(before)
  })

  it('收尾默写答对:播音前进但不入统计;答错原地重试', () => {
    let p = newLessonProgress('2026-07-17', plan)
    while (p.steps[p.cursor].type !== 'closing') p = passStep(p).progress
    const answeredBefore = p.answered
    const cursorBefore = p.cursor

    const wrong = applyLessonEvent(p, { type: 'ANSWER', correct: false })
    expect(wrong.progress.cursor).toBe(cursorBefore) // 原地重试
    expect(fx(wrong.effects, 'ANSWERED')).toEqual([])
    expect(fx(wrong.effects, 'RATE')).toEqual([])

    const right = applyLessonEvent(wrong.progress, { type: 'ANSWER', correct: true })
    expect(right.progress.cursor).toBe(cursorBefore + 1)
    expect(fx(right.effects, 'PLAY_WORD')).toHaveLength(1)
    expect(fx(right.effects, 'PROGRESS')).toEqual([]) // 收尾不计 doneCount
    expect(right.progress.answered).toBe(answeredBefore)
  })

  it('描红完成:播发音(书写完成),不推 doneCount', () => {
    let p = newLessonProgress('2026-07-17', plan)
    while (p.steps[p.cursor].type !== 'trace') p = passStep(p).progress
    const r = applyLessonEvent(p, { type: 'STEP_DONE' })
    expect(fx(r.effects, 'PLAY_WORD')).toHaveLength(1)
    expect(fx(r.effects, 'PROGRESS')).toEqual([])
  })

  it('事件与当前步不匹配 → 原样忽略(选择题不收 FORGOT,默写不收 STEP_DONE)', () => {
    let p = newLessonProgress('2026-07-17', plan) // 当前步是默写
    expect(applyLessonEvent(p, { type: 'STEP_DONE' }).effects).toEqual([])
    while (p.steps[p.cursor].type !== 'choice') p = passStep(p).progress
    const r = applyLessonEvent(p, { type: 'FORGOT' }) // H-3 无"想不起来"按钮
    expect(r.progress).toBe(p)
    expect(r.effects).toEqual([])
  })

  it('序列化往返:断点恢复后继续走完(含重试中的 attempted 标记)', () => {
    let p = newLessonProgress('2026-07-17', plan)
    for (let i = 0; i < 4; i++) p = passStep(p).progress
    p = applyLessonEvent(p, { type: 'ANSWER', correct: false }).progress // 留一个重试中状态
    const revived = JSON.parse(JSON.stringify(p)) as LessonProgress
    expect(revived).toEqual(p)
    let q = revived
    while (!lessonFinished(q)) q = passStep(q).progress
    expect(lessonFinished(q)).toBe(true)
  })

  it('空计划(理论边界):立即视为完成,不产生事件', () => {
    const p = newLessonProgress('2026-07-17', [] as LessonStep[])
    expect(lessonFinished(p)).toBe(true)
    expect(applyLessonEvent(p, { type: 'STEP_DONE' }).effects).toEqual([])
  })
})
