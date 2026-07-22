import { describe, expect, it } from 'vitest'
import { HATCH_MS } from './types'
import {
  HATCH_OUTCOME_DISPLAY_MS,
  hatchOutcomeVisualState,
  incubationHatcheryVisualState,
  TWO_SHELLS_DISPLAY_MS,
} from './hatcheryVisual'

describe('完整鸡窝状态选择', () => {
  it('按剩余时间比例切换完整蛋、细裂纹和大裂纹', () => {
    expect(incubationHatcheryVisualState(null)).toBe('empty')
    expect(incubationHatcheryVisualState({ remainingMs: HATCH_MS })).toBe('whole')
    expect(incubationHatcheryVisualState({ remainingMs: HATCH_MS * 0.5 + 1 })).toBe('whole')
    expect(incubationHatcheryVisualState({ remainingMs: HATCH_MS * 0.5 })).toBe('hairlineCrack')
    expect(incubationHatcheryVisualState({ remainingMs: HATCH_MS * 0.2 + 1 })).toBe('hairlineCrack')
    expect(incubationHatcheryVisualState({ remainingMs: HATCH_MS * 0.2 })).toBe('largeCrack')
    expect(incubationHatcheryVisualState({ remainingMs: 0 })).toBe('largeCrack')
  })

  it('破壳后才按结果稀有度选择完整出壳贴图', () => {
    expect(hatchOutcomeVisualState('normal')).toBe('normalHatch')
    expect(hatchOutcomeVisualState('color')).toBe('colorHatch')
    expect(hatchOutcomeVisualState('special')).toBe('specialHatch')
    expect(TWO_SHELLS_DISPLAY_MS).toBe(800)
    expect(HATCH_OUTCOME_DISPLAY_MS).toBe(1_500)
  })
})
