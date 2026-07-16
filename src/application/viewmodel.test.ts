import { describe, expect, it } from 'vitest'
import { assembleViewModel, type FarmSnapshot } from './viewmodel'

function snapshot(doneCount: number): FarmSnapshot {
  return {
    farm: { henName: '咕咕', eggStock: 0, incubating: [], cooking: 'empty' },
    meta: { streak: 2, lastDoneDate: null, totalDays: 2, installDate: '2026-07-15' },
    motionEnabled: true,
    session: {
      date: '2026-07-17',
      reviewIds: ['old-a', 'old-b'],
      newIds: ['new-a', 'new-b'],
      doneCount,
      answered: doneCount,
      correct: doneCount,
      completed: false,
    },
    chicksTotal: 0,
    latestChicks: [],
    rescueCount: 0,
    now: new Date('2026-07-17T09:00:00+08:00').getTime(),
  }
}

describe('F4 首页进度 ViewModel', () => {
  it('区分学习步骤、完成朋友数与今日新词数', () => {
    const afterReviews = assembleViewModel(snapshot(2))
    expect(afterReviews.totalItemsToday).toBe(4)
    expect(afterReviews.learnedToday).toBe(2)
    expect(afterReviews.newWordsLearnedToday).toBe(0)

    const afterNewWordIntro = assembleViewModel(snapshot(3))
    expect(afterNewWordIntro.learnedToday).toBe(2)
    expect(afterNewWordIntro.newWordsLearnedToday).toBe(0)

    const afterNewWordQuiz = assembleViewModel(snapshot(4))
    expect(afterNewWordQuiz.learnedToday).toBe(3)
    expect(afterNewWordQuiz.newWordsLearnedToday).toBe(1)
    expect(afterNewWordQuiz.eggsEarnedToday).toBe(1)
  })
})
