import { describe, expect, it } from 'vitest'
import { completeDay } from './streak'
import type { MetaState } from './types'

const meta = (over: Partial<MetaState> = {}): MetaState => ({
  streak: 0, lastDoneDate: null, totalDays: 0, installDate: '2026-07-01', ...over,
})

describe('completeDay', () => {
  it('连续两天 streak+1', () => {
    const m = completeDay(meta({ streak: 5, lastDoneDate: '2026-07-16', totalDays: 10 }), '2026-07-17')
    expect(m).toMatchObject({ streak: 6, lastDoneDate: '2026-07-17', totalDays: 11 })
  })

  it('断档后 streak 回到 1,totalDays 照加', () => {
    const m = completeDay(meta({ streak: 5, lastDoneDate: '2026-07-10', totalDays: 10 }), '2026-07-17')
    expect(m).toMatchObject({ streak: 1, totalDays: 11 })
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
