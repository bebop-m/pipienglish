import { describe, expect, it } from 'vitest'
import { nextRescueStage, normalizeRescueAnswer, normalizeRescueStage, rescueStageIndex } from './rescue'

describe('救援领域规则', () => {
  it('兼容旧记录并按四段推进', () => {
    expect(normalizeRescueStage(undefined)).toBe('intro')
    expect(normalizeRescueStage('unknown')).toBe('intro')
    expect(nextRescueStage('intro')).toBe('trace')
    expect(nextRescueStage('trace')).toBe('choice')
    expect(nextRescueStage('choice')).toBe('dictation')
    expect(nextRescueStage('dictation')).toBeNull()
    expect(rescueStageIndex('dictation')).toBe(4)
  })

  it('英文答案只归一首尾空白、Unicode 与大小写', () => {
    expect(normalizeRescueAnswer('  EGG  ')).toBe('egg')
    expect(normalizeRescueAnswer('ice cream')).not.toBe(normalizeRescueAnswer('icecream'))
  })
})
