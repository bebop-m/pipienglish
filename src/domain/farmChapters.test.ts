import { describe, expect, it } from 'vitest'
import {
  availableChapter,
  boundedAcknowledgedChapter,
  eligibleChapter,
  enterableChapter,
  nextCelebrationChapter,
  nextTravelChapter,
  pendingTravelChapters,
} from './farmChapters'

describe('36 完成日章节资格', () => {
  it.each([
    [0, 1], [35, 1], [36, 2], [71, 2], [72, 3], [108, 4],
  ])('totalDays=%i 时 eligibleChapter=%i', (totalDays, expected) => {
    expect(eligibleChapter(totalDays)).toBe(expected)
  })

  it('availableChapter 只承认从第 1 章开始连续存在的核心包', () => {
    expect(availableChapter([])).toBe(0)
    expect(availableChapter([{ chapter: 1 }, { chapter: 2 }, { chapter: 3 }])).toBe(3)
    expect(availableChapter([{ chapter: 1 }, { chapter: 3 }, { chapter: 4 }])).toBe(1)
  })

  it('enterableChapter 取资格与本地可用内容的较小值，不回退 totalDays', () => {
    expect(enterableChapter(72, 1)).toBe(1)
    expect(enterableChapter(72, 2)).toBe(2)
    expect(enterableChapter(72, 3)).toBe(3)
    expect(enterableChapter(35, 9)).toBe(1)
  })

  it('积累多个章节时也必须每次 activeChapter+1 顺序旅行', () => {
    expect(nextTravelChapter(1, 4)).toBe(2)
    expect(nextTravelChapter(2, 4)).toBe(3)
    expect(nextTravelChapter(4, 4)).toBeNull()
    expect(pendingTravelChapters(1, 4)).toEqual([2, 3, 4])
  })

  it('内容脱期时 acknowledged 不越界，更新后从下一章按序补放庆祝', () => {
    expect(boundedAcknowledgedChapter(3, 1)).toBe(1)
    expect(nextCelebrationChapter(1, 1)).toBeNull()
    expect(nextCelebrationChapter(1, 3)).toBe(2)
    expect(nextCelebrationChapter(2, 3)).toBe(3)
    expect(nextCelebrationChapter(3, 3)).toBeNull()
  })
})
