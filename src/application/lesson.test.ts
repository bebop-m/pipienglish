// 学习流用例集成测试(fake-indexeddb):
// 首日全链路 → 发蛋连胜;断点恢复;答错原地重试;想不起来→救援;次日复习计划;VM 组装

import { describe, expect, it, vi } from 'vitest'
import { PipiDB } from './db'
import { createFarmUsecases } from './usecases/farmHome'
import { createLessonUsecases } from './usecases/lesson'
import { totalItems } from '../domain/dailyPlan'
import { lessonFinished, type LessonProgress } from '../domain/lesson'
import { dayKeyOf } from '../domain/time'

let dbSeq = 0
const freshDb = () => new PipiDB(`pipitest-lesson-${Date.now()}-${dbSeq++}`)

const DAY_MS = 24 * 60 * 60 * 1000

function setup(db: PipiDB) {
  const farm = createFarmUsecases(db)
  const speak = vi.fn()
  const lesson = createLessonUsecases(db, { completeDailyLesson: farm.completeDailyLesson, speak })
  return { farm, lesson, speak }
}

/** 按当前步类型全对走一步 */
async function passCurrent(lesson: ReturnType<typeof createLessonUsecases>, p: LessonProgress, now: number) {
  const step = p.steps[p.cursor]
  if (step.type === 'intro' || step.type === 'trace') return lesson.dispatch({ type: 'STEP_DONE' }, now)
  return lesson.dispatch({ type: 'ANSWER', correct: true }, now)
}

describe('学习流用例(应用层)', () => {
  it('首日全链路:4 新词 16 步 → doneCount=任务项 → 完成发蛋连胜;书写/答对自动播音', async () => {
    const db = freshDb()
    const { farm, lesson, speak } = setup(db)
    const t0 = Date.now()

    await farm.clockGuard(t0)
    await farm.nameHen('咕咕')
    let p = await lesson.loadToday(t0)
    // 首日无复习:4 × (听看/描红/选择) + 4 收尾默写
    expect(p.steps).toHaveLength(16)

    while (!lessonFinished(p)) p = await passCurrent(lesson, p, t0)

    const session = (await db.sessions.get(dayKeyOf(t0)))!
    expect(session.completed).toBe(true) // COMPLETED → 注入的 completeDailyLesson
    expect(session.doneCount).toBe(totalItems(session)) // 口径 = 复习×1 + 新词×2
    expect(session.answered).toBe(4) // 新词自测 ×4(收尾不计)
    expect(session.correct).toBe(4)

    const vm = await farm.loadViewModel(t0)
    expect(vm.state).toBe('daily_complete')
    expect(vm.eggStock).toBe(1)
    expect(vm.streak).toBe(1)

    // 音频:描红×4 + 选择答对×4 + 收尾写对×4 = 12 次(听看卡进场自动播放归视觉层)
    expect(speak).toHaveBeenCalledTimes(12)
    expect(await db.seen.count()).toBe(12 + 4) // 12 起步词播种 + 今日 4 新词

    const lessonVm = await lesson.loadViewModel(t0)
    expect(lessonVm.finished).toBe(true)
    expect(lessonVm.summary).toMatchObject({ newWords: 4, reviews: 0, correctRate: 1 })
    db.close()
  })

  it('断点恢复:走 5 步后"重启应用",进度与队列原样续上', async () => {
    const db = freshDb()
    const { farm, lesson } = setup(db)
    const t0 = Date.now()
    await farm.clockGuard(t0)

    let p = await lesson.loadToday(t0)
    for (let i = 0; i < 5; i++) p = await passCurrent(lesson, p, t0)

    // 模拟冷启动:同一个库,新建用例实例
    const { lesson: lesson2 } = setup(db)
    const revived = await lesson2.loadToday(t0)
    expect(revived).toEqual(p)
    expect(revived.cursor).toBe(5)

    while (!lessonFinished(p)) p = await passCurrent(lesson2, p, t0)
    expect((await db.sessions.get(dayKeyOf(t0)))!.completed).toBe(true)
    db.close()
  })

  it('答错原地重试:首错记 Again(due 提前)+ 留在本题;重试答对不覆盖 FSRS 并前进', async () => {
    const db = freshDb()
    const { farm, lesson } = setup(db)
    const t0 = Date.now()
    await farm.clockGuard(t0)

    let p = await lesson.loadToday(t0)
    // 走到第一个选择题(第 3 步)
    p = await passCurrent(lesson, p, t0) // intro
    p = await passCurrent(lesson, p, t0) // trace
    const quizStep = p.steps[p.cursor]
    expect(quizStep.type).toBe('choice')
    const cursorBefore = p.cursor

    p = await lesson.dispatch({ type: 'ANSWER', correct: false }, t0)
    expect(p.cursor).toBe(cursorBefore) // 原地重试
    const afterWrong = (await db.cards.get(quizStep.wordId))!
    expect(afterWrong.lastQuizType).toBe('choice')
    expect(afterWrong.due).toBeLessThan(t0 + DAY_MS) // Again:很快再见

    p = await lesson.dispatch({ type: 'ANSWER', correct: true }, t0)
    expect(p.cursor).toBe(cursorBefore + 1) // 答对才前进
    expect((await db.cards.get(quizStep.wordId))!.due).toBe(afterWrong.due) // Again 定调不被覆盖

    while (!lessonFinished(p)) p = await passCurrent(lesson, p, t0)
    expect((await db.cards.get(quizStep.wordId))!.due).toBe(afterWrong.due)
    db.close()
  })

  it('想不起来(收尾默写):进救援队列并跳过;救援数出现在首页 VM', async () => {
    const db = freshDb()
    const { farm, lesson } = setup(db)
    const t0 = Date.now()
    await farm.clockGuard(t0)

    let p = await lesson.loadToday(t0)
    while (p.steps[p.cursor].type !== 'closing') p = await passCurrent(lesson, p, t0)
    const wordId = p.steps[p.cursor].wordId
    const cursorBefore = p.cursor
    p = await lesson.dispatch({ type: 'FORGOT' }, t0)

    expect(p.cursor).toBe(cursorBefore + 1) // 跳过本题
    expect(await db.rescue.get(wordId)).toMatchObject({ wordId })
    expect((await farm.loadViewModel(t0)).rescueCount).toBe(1)
    db.close()
  })

  it('次日:昨日新词进复习队列,旧断点被清理,题型按 stability 分配', async () => {
    const db = freshDb()
    const { farm, lesson } = setup(db)
    const t0 = Date.now()
    await farm.clockGuard(t0)
    let p = await lesson.loadToday(t0)
    while (!lessonFinished(p)) p = await passCurrent(lesson, p, t0)

    const t1 = t0 + DAY_MS
    await farm.clockGuard(t1) // 翻转:重建今日会话
    const session2 = (await db.sessions.get(dayKeyOf(t1)))!
    expect(session2.reviewIds.length).toBeGreaterThan(0) // 昨日 Good 的新词今天到期

    const p2 = await lesson.loadToday(t1)
    expect(p2.date).toBe(dayKeyOf(t1))
    const reviewSteps = p2.steps.filter(s => s.phase === 'review')
    expect(reviewSteps.length).toBe(session2.reviewIds.length)
    for (const s of reviewSteps) expect(['choice', 'listening']).toContain(s.type) // stability < 7 天,无默写

    // 旧断点清理:只剩今天的 lesson: 键
    const lessonKeys = (await db.kv.toArray()).map(r => r.key).filter(k => k.startsWith('lesson:'))
    expect(lessonKeys).toEqual([`lesson:${dayKeyOf(t1)}`])
    db.close()
  })

  it('loadViewModel:听看卡新词三步序号、选择题选项带稳定 id 且不泄英文', async () => {
    const db = freshDb()
    const { farm, lesson } = setup(db)
    const t0 = Date.now()
    await farm.clockGuard(t0)

    let vm = await lesson.loadViewModel(t0)
    expect(vm.current).toMatchObject({ type: 'intro', phase: 'new', stepOrdinal: 1, stepOrdinalTotal: 3 })

    await lesson.dispatch({ type: 'STEP_DONE' }, t0)
    vm = await lesson.loadViewModel(t0)
    expect(vm.current).toMatchObject({ type: 'trace', stepOrdinal: 2 })

    await lesson.dispatch({ type: 'STEP_DONE' }, t0)
    vm = await lesson.loadViewModel(t0)
    expect(vm.current!.type).toBe('choice')
    expect(vm.current!.stepOrdinal).toBe(3)
    expect(vm.current!.options).toHaveLength(4)
    const labels = vm.current!.options!.map(o => o.label)
    expect(labels).toContain(vm.current!.word.meaning)
    const correct = vm.current!.options!.find(o => o.id === vm.current!.correctOptionId)!
    expect(correct.label).toBe(vm.current!.word.meaning)
    for (const o of vm.current!.options!) expect(o.id).toMatch(/^opt-\d$/) // id 不携带英文

    // 答错留在本题:VM 不切词
    await lesson.dispatch({ type: 'ANSWER', correct: false }, t0)
    const retryVm = await lesson.loadViewModel(t0)
    expect(retryVm.current!.stepId).toBe(vm.current!.stepId)
    db.close()
  })

  it('收尾默写 VM:同类型序号 第 x 题 / 共 4 题', async () => {
    const db = freshDb()
    const { farm, lesson } = setup(db)
    const t0 = Date.now()
    await farm.clockGuard(t0)

    let p = await lesson.loadToday(t0)
    while (p.steps[p.cursor].type !== 'closing') p = await passCurrent(lesson, p, t0)
    const vm = await lesson.loadViewModel(t0)
    expect(vm.current).toMatchObject({ type: 'closing', stepOrdinal: 1, stepOrdinalTotal: 4 })
    db.close()
  })
})
