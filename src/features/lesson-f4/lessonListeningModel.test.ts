import { describe, expect, it } from 'vitest'
import { shouldRevealListeningTarget } from './lessonListeningModel'

describe('H-4 听音题显示边界', () => {
  it('准备和答错重试时隐藏目标词形，只有答对后揭示', () => {
    expect(shouldRevealListeningTarget('ready')).toBe(false)
    expect(shouldRevealListeningTarget('retry')).toBe(false)
    expect(shouldRevealListeningTarget('correct')).toBe(true)
  })
})
