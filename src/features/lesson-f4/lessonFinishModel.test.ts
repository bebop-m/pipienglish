import { describe, expect, it } from 'vitest'
import { normalizeLessonFinishSummary } from './lessonFinishModel'

describe('lesson finish model', () => {
  it('keeps valid whole-number report values', () => {
    expect(normalizeLessonFinishSummary({ newWords: 4, reviews: 6, streakDays: 3, eggsEarned: 1 })).toEqual({
      newWords: 4,
      reviews: 6,
      streakDays: 3,
      eggsEarned: 1,
    })
  })

  it('never renders negative, fractional, or non-finite counts', () => {
    expect(normalizeLessonFinishSummary({ newWords: -1, reviews: 2.9, streakDays: Number.NaN, eggsEarned: Number.POSITIVE_INFINITY })).toEqual({
      newWords: 0,
      reviews: 2,
      streakDays: 0,
      eggsEarned: 0,
    })
  })
})
