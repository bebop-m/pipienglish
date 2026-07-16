import { describe, expect, it } from 'vitest'
import { stalenessWeight, weightedSample } from './staleness'

const DAY = 86_400_000

describe('stalenessWeight', () => {
  it('P ∝ (天数+1)²:今天=1,昨天=4,9 天前=100', () => {
    const now = 100 * DAY
    expect(stalenessWeight(now, now)).toBe(1)
    expect(stalenessWeight(now - DAY, now)).toBe(4)
    expect(stalenessWeight(now - 9 * DAY, now)).toBe(100)
  })

  it('未来时间戳按 0 天处理(时钟回拨防御)', () => {
    expect(stalenessWeight(200 * DAY, 100 * DAY)).toBe(1)
  })
})

describe('weightedSample', () => {
  const now = 100 * DAY
  const pool = [
    { wordId: 'fresh', lastSeenAt: now },          // 权重 1
    { wordId: 'stale', lastSeenAt: now - 9 * DAY }, // 权重 100
  ]

  it('rng 落点决定选择:小 r 选队首,权重大者更容易被选中', () => {
    // 权重排列 [fresh:1, stale:100],total=101;r=0.5*101=50.5 落在 stale
    expect(weightedSample(pool, 1, now, () => 0.5)).toEqual(['stale'])
    // r=0.001*101≈0.1 落在 fresh
    expect(weightedSample(pool, 1, now, () => 0.001)).toEqual(['fresh'])
  })

  it('不放回:抽满不重复;需求超池子时全量返回', () => {
    const drawn = weightedSample(pool, 5, now, () => 0.5)
    expect(drawn.sort()).toEqual(['fresh', 'stale'])
  })

  it('统计验证:1000 次抽 1,stale 占比显著高', () => {
    let staleCount = 0
    let seed = 12345
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed / 2 ** 31
    }
    for (let i = 0; i < 1000; i++) {
      if (weightedSample(pool, 1, now, rng)[0] === 'stale') staleCount++
    }
    expect(staleCount).toBeGreaterThan(900) // 期望 ≈ 100/101 ≈ 99%
  })
})
