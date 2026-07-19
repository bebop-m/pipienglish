import { describe, expect, it, vi } from 'vitest'
import {
  COLOR_HATCH_PROBABILITY,
  hatchDueAt,
  hatchRemainingMs,
  isHatchReady,
  NORMAL_HATCH_PROBABILITY,
  placeEgg,
  rollHatchRarity,
  SPECIAL_HATCH_PROBABILITY,
  type HatchPlacementState,
  type HatchVariantPools,
} from './hatchRarity'
import { HATCH_MS } from './types'

const emptyState = (over: Partial<HatchPlacementState> = {}): HatchPlacementState => ({
  eggStock: 1,
  incubating: null,
  normalHatchStreak: 0,
  nonSpecialHatchStreak: 0,
  ...over,
})
const pools: HatchVariantPools = {
  normal: ['normal-default'],
  color: ['color-a', 'color-b', 'color-c'],
  special: ['special-a'],
}

describe('83/15/2 与隐藏保底', () => {
  it('概率阈值严格覆盖普通 83%、异色 15%、特殊 2%', () => {
    expect(NORMAL_HATCH_PROBABILITY).toBe(0.83)
    expect(COLOR_HATCH_PROBABILITY).toBe(0.15)
    expect(SPECIAL_HATCH_PROBABILITY).toBe(0.02)
    expect(rollHatchRarity(emptyState(), () => 0).rarity).toBe('normal')
    expect(rollHatchRarity(emptyState(), () => 0.829999).rarity).toBe('normal')
    expect(rollHatchRarity(emptyState(), () => 0.83).rarity).toBe('color')
    expect(rollHatchRarity(emptyState(), () => 0.979999).rarity).toBe('color')
    expect(rollHatchRarity(emptyState(), () => 0.98).rarity).toBe('special')
  })

  it('normalHatchStreak>=9 时基础普通提升为异色，但基础特殊仍保留', () => {
    expect(rollHatchRarity(emptyState({ normalHatchStreak: 9 }), () => 0.2)).toMatchObject({
      rarity: 'color', normalHatchStreak: 0, nonSpecialHatchStreak: 1,
    })
    expect(rollHatchRarity(emptyState({ normalHatchStreak: 9 }), () => 0.99)).toMatchObject({
      rarity: 'special', normalHatchStreak: 0, nonSpecialHatchStreak: 0,
    })
  })

  it('nonSpecialHatchStreak>=35 强制特殊，双保底时特殊优先且不读取概率随机数', () => {
    const random = vi.fn(() => 0)
    expect(rollHatchRarity({ normalHatchStreak: 9, nonSpecialHatchStreak: 35 }, random)).toEqual({
      rarity: 'special', normalHatchStreak: 0, nonSpecialHatchStreak: 0,
    })
    expect(random).not.toHaveBeenCalled()
  })

  it('三类结果分别更新两个计数器', () => {
    const start = { normalHatchStreak: 3, nonSpecialHatchStreak: 7 }
    expect(rollHatchRarity(start, () => 0.1)).toEqual({
      rarity: 'normal', normalHatchStreak: 4, nonSpecialHatchStreak: 8,
    })
    expect(rollHatchRarity(start, () => 0.9)).toEqual({
      rarity: 'color', normalHatchStreak: 0, nonSpecialHatchStreak: 8,
    })
    expect(rollHatchRarity(start, () => 0.99)).toEqual({
      rarity: 'special', normalHatchStreak: 0, nonSpecialHatchStreak: 0,
    })
  })
})

describe('可重放的放蛋结果', () => {
  it('注入随机源与时间源，在放蛋时扣蛋并固定稀有度、未拥有款式和时间', () => {
    const randomValues = [0.9, 0.999]
    const result = placeEgg(
      emptyState({ eggStock: 3 }),
      pools,
      new Set(['color-a']),
      { now: () => 123_456, random: () => randomValues.shift()! },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.outcome).toEqual({ placedAt: 123_456, rarity: 'color', variantId: 'color-c' })
    expect(result.state).toMatchObject({
      eggStock: 2,
      incubating: result.outcome,
      normalHatchStreak: 0,
      nonSpecialHatchStreak: 1,
    })
  })

  it('无蛋、巢占用或结果款式池为空时原状态不变，且守卫不读取时间/随机源', () => {
    const now = vi.fn(() => 1)
    const random = vi.fn(() => 0)
    const noEgg = emptyState({ eggStock: 0 })
    expect(placeEgg(noEgg, pools, new Set(), { now, random })).toEqual({ ok: false, state: noEgg, reason: 'no-egg' })
    const occupied = emptyState({ incubating: { placedAt: 0, rarity: 'normal', variantId: 'n' } })
    expect(placeEgg(occupied, pools, new Set(), { now, random })).toEqual({
      ok: false, state: occupied, reason: 'nest-occupied',
    })
    expect(now).not.toHaveBeenCalled()
    expect(random).not.toHaveBeenCalled()

    const noNormalPool = { ...pools, normal: [] }
    const initial = emptyState()
    expect(placeEgg(initial, noNormalPool, new Set(), { now, random })).toEqual({
      ok: false, state: initial, reason: 'variant-pool-empty',
    })
    expect(initial.eggStock).toBe(1)
    expect(initial.normalHatchStreak).toBe(0)
    expect(now).not.toHaveBeenCalled()
  })

  it('24 小时到期时间和恰好边界可由注入的 now 直接验证', () => {
    const placedAt = 50
    expect(hatchDueAt(placedAt)).toBe(placedAt + HATCH_MS)
    expect(isHatchReady(placedAt, placedAt + HATCH_MS - 1)).toBe(false)
    expect(hatchRemainingMs(placedAt, placedAt + HATCH_MS - 1)).toBe(1)
    expect(isHatchReady(placedAt, placedAt + HATCH_MS)).toBe(true)
    expect(hatchRemainingMs(placedAt, placedAt + HATCH_MS + 1)).toBe(0)
  })
})
