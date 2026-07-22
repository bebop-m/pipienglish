import { describe, expect, it } from 'vitest'
import type { FarmHomeViewModel } from '../../../application/viewmodel'
import {
  chapterCelebrationTravelLabel,
  compactHatchRemaining,
  currentHatcheryVisualState,
  hatchProgressRatio,
} from './FarmHomeDaily'

describe('单巢友好剩余时间', () => {
  it('只显示小时或分钟粒度，不制造秒级倒计时', () => {
    expect(compactHatchRemaining(24 * 60 * 60 * 1000)).toBe('24 小时')
    expect(compactHatchRemaining(61 * 60 * 1000)).toBe('2 小时')
    expect(compactHatchRemaining(59 * 60 * 1000 + 1)).toBe('60 分钟')
    expect(compactHatchRemaining(1)).toBe('1 分钟')
    expect(compactHatchRemaining(0)).toBe('即将破壳')
  })

  it('用 0 到 1 表示已完成的孵化进度，并钳制异常边界', () => {
    const hatchMs = 24 * 60 * 60 * 1000
    expect(hatchProgressRatio(null, false)).toBe(0)
    expect(hatchProgressRatio(hatchMs, false)).toBe(0)
    expect(hatchProgressRatio(hatchMs * 0.4, false)).toBeCloseTo(0.6)
    expect(hatchProgressRatio(-1, false)).toBe(1)
    expect(hatchProgressRatio(hatchMs * 2, false)).toBe(0)
    expect(hatchProgressRatio(null, true)).toBe(1)
  })
})

describe('孵化完整贴图切换', () => {
  it('孵化中只依据公开剩余时间，不需要稀有度或款式', () => {
    expect(currentHatcheryVisualState({
      viewedSceneId: 'scene-1',
      incubating: { placedAt: 1, hatchesAt: 2, remainingMs: 18 * 60 * 60 * 1000 },
      hatchTransition: null,
    })).toBe('whole')
  })

  it('结算后先显示两半蛋壳，再显示对应结果', () => {
    const transition = {
      chickId: 'new-chick',
      sceneId: 'scene-1',
      rarity: 'special' as const,
      variantId: 'chick-special-approved-f',
    }
    expect(currentHatcheryVisualState({
      viewedSceneId: 'scene-1',
      incubating: null,
      hatchTransition: { ...transition, phase: 'two_shells' },
    })).toBe('twoShells')
    expect(currentHatcheryVisualState({
      viewedSceneId: 'scene-1',
      incubating: null,
      hatchTransition: { ...transition, phase: 'outcome' },
    })).toBe('specialHatch')
  })
})

describe('章节庆祝出发文案', () => {
  it('庆祝章节超前时明示实际会先去的下一站', () => {
    const nextTravelScene = { chapter: 2 } as FarmHomeViewModel['nextTravelScene']

    expect(chapterCelebrationTravelLabel(nextTravelScene)).toBe('先去第 2 章')
  })

  it('缺少下一站时保留安全兜底文案', () => {
    expect(chapterCelebrationTravelLabel(null)).toBe('现在出发')
  })
})
