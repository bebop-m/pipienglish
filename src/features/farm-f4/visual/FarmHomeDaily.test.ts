import { describe, expect, it } from 'vitest'
import type { FarmHomeViewModel } from '../../../application/viewmodel'
import { chapterCelebrationTravelLabel, friendlyHatchRemaining } from './FarmHomeDaily'

describe('单巢友好剩余时间', () => {
  it('只显示小时或分钟粒度，不制造秒级倒计时', () => {
    expect(friendlyHatchRemaining(24 * 60 * 60 * 1000)).toBe('约 24 小时')
    expect(friendlyHatchRemaining(61 * 60 * 1000)).toBe('约 2 小时')
    expect(friendlyHatchRemaining(59 * 60 * 1000 + 1)).toBe('约 60 分钟')
    expect(friendlyHatchRemaining(1)).toBe('约 1 分钟')
    expect(friendlyHatchRemaining(0)).toBe('马上就要破壳啦')
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
