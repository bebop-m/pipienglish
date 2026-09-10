import { describe, expect, it } from 'vitest'
import { completeDay, SHIELD_CARD_CAP, shieldCardsForStreak } from './streak'
import type { MetaState } from './types'

const meta = (over: Partial<MetaState> = {}): MetaState => ({
  streak: 0, lastDoneDate: null, totalDays: 0, installDate: '2026-07-01', freezeCards: 0, lastShieldUsedOn: null, ...over,
})

describe('completeDay', () => {
  it('连续两天 streak+1', () => {
    const m = completeDay(meta({ streak: 5, lastDoneDate: '2026-07-16', totalDays: 10 }), '2026-07-17')
    expect(m).toMatchObject({ streak: 6, lastDoneDate: '2026-07-17', totalDays: 11, freezeCards: 0, lastShieldUsedOn: null })
  })

  it('没有守护卡时断档归 1,totalDays 照加', () => {
    const m = completeDay(meta({ streak: 5, lastDoneDate: '2026-07-10', totalDays: 10 }), '2026-07-17')
    expect(m).toMatchObject({ streak: 1, totalDays: 11, freezeCards: 0, lastShieldUsedOn: null })
  })

  it('漏 1 天有 1 张卡:扣卡接上连胜,并记下用卡日期', () => {
    const m = completeDay(meta({ streak: 9, lastDoneDate: '2026-07-15', totalDays: 12, freezeCards: 1 }), '2026-07-17')
    expect(m).toMatchObject({ streak: 10, totalDays: 13, freezeCards: 0, lastShieldUsedOn: '2026-07-17' })
  })

  it('漏 2 天有 3 张卡:扣 2 张', () => {
    const m = completeDay(meta({ streak: 9, lastDoneDate: '2026-07-14', totalDays: 12, freezeCards: 3 }), '2026-07-17')
    expect(m).toMatchObject({ streak: 10, freezeCards: 1, lastShieldUsedOn: '2026-07-17' })
  })

  it('漏 3 天只有 2 张卡:一张不扣,连胜归 1', () => {
    const m = completeDay(meta({ streak: 9, lastDoneDate: '2026-07-13', totalDays: 12, freezeCards: 2 }), '2026-07-17')
    expect(m).toMatchObject({ streak: 1, freezeCards: 2, lastShieldUsedOn: null })
  })

  it('连胜到 7、14 各发 1 张,最多持有 3 张', () => {
    const seven = completeDay(meta({ streak: 6, lastDoneDate: '2026-07-16', totalDays: 6 }), '2026-07-17')
    expect(seven).toMatchObject({ streak: 7, freezeCards: 1 })
    const fourteen = completeDay(meta({ streak: 13, lastDoneDate: '2026-07-16', totalDays: 13, freezeCards: 1 }), '2026-07-17')
    expect(fourteen).toMatchObject({ streak: 14, freezeCards: 2 })
    const capped = completeDay(meta({ streak: 27, lastDoneDate: '2026-07-16', totalDays: 27, freezeCards: 3 }), '2026-07-17')
    expect(capped).toMatchObject({ streak: 28, freezeCards: SHIELD_CARD_CAP })
  })

  it('用卡接上连胜后正好到 7 的倍数:先扣后发', () => {
    const m = completeDay(meta({ streak: 13, lastDoneDate: '2026-07-15', totalDays: 13, freezeCards: 1 }), '2026-07-17')
    expect(m).toMatchObject({ streak: 14, freezeCards: 1, lastShieldUsedOn: '2026-07-17' })
  })

  it('旧记录没有 freezeCards 字段:按 0 张处理', () => {
    const legacy = { streak: 5, lastDoneDate: '2026-07-10', totalDays: 10, installDate: '2026-07-01' } as MetaState
    expect(completeDay(legacy, '2026-07-17')).toMatchObject({ streak: 1, freezeCards: 0, lastShieldUsedOn: null })
  })

  it('同日重复调用幂等', () => {
    const once = completeDay(meta(), '2026-07-17')
    expect(completeDay(once, '2026-07-17')).toEqual(once)
  })

  it('跨月边界(7-31 → 8-01)也算连续', () => {
    const m = completeDay(meta({ streak: 3, lastDoneDate: '2026-07-31', totalDays: 3 }), '2026-08-01')
    expect(m.streak).toBe(4)
  })
})

describe('shieldCardsForStreak', () => {
  it('每 7 天 1 张,最多 3 张', () => {
    expect(shieldCardsForStreak(0)).toBe(0)
    expect(shieldCardsForStreak(6)).toBe(0)
    expect(shieldCardsForStreak(7)).toBe(1)
    expect(shieldCardsForStreak(20)).toBe(2)
    expect(shieldCardsForStreak(40)).toBe(3)
  })
})
