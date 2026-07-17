// 今日队列规则单测:复习上限 / 新词上限 / 积压自动暂停(SPEC §5.1)

import { describe, expect, it } from 'vitest'
import { buildPlan, shouldPauseNewWords, totalItems, BACKLOG_PAUSE_THRESHOLD } from './dailyPlan'

const ids = (n: number, prefix = 'w') => Array.from({ length: n }, (_, i) => `${prefix}${i}`)
const calm = [{ backlog: 0, paused: false }, { backlog: 0, paused: false }]
const overloaded = (paused = false) => ({ backlog: BACKLOG_PAUSE_THRESHOLD + 1, paused })

describe('buildPlan', () => {
  it('复习 ≤6 最过期优先,新词 ≤4 按投放顺序', () => {
    const plan = buildPlan({ dueByOverdue: ids(10, 'r'), unlearned: ids(9, 'n'), backlogToday: 10, recentBacklogs: calm })
    expect(plan.reviewIds).toEqual(['r0', 'r1', 'r2', 'r3', 'r4', 'r5'])
    expect(plan.newIds).toEqual(['n0', 'n1', 'n2', 'n3'])
    expect(plan.newWordsPaused).toBe(false)
    expect(totalItems(plan)).toBe(14)
  })

  it('连续 3 天积压 >12 → 暂停新词,复习照常', () => {
    const plan = buildPlan({
      dueByOverdue: ids(13, 'r'),
      unlearned: ids(9, 'n'),
      backlogToday: 13,
      recentBacklogs: [overloaded(), overloaded()],
    })
    expect(plan.newIds).toEqual([])
    expect(plan.newWordsPaused).toBe(true)
    expect(plan.reviewIds).toHaveLength(6)
  })
})

describe('shouldPauseNewWords', () => {
  it('只有今天积压不触发(需连续 3 天)', () => {
    expect(shouldPauseNewWords(20, calm)).toBe(false)
    expect(shouldPauseNewWords(20, [overloaded(), { backlog: 5, paused: false }])).toBe(false)
  })

  it('连续 3 天积压触发', () => {
    expect(shouldPauseNewWords(13, [overloaded(), overloaded()])).toBe(true)
  })

  it('已连停 2 天 → 恢复投放(最多停 2 天,不无限饿新词)', () => {
    expect(shouldPauseNewWords(13, [overloaded(true), overloaded(true)])).toBe(false)
    expect(shouldPauseNewWords(13, [overloaded(true), overloaded(false)])).toBe(true)
  })

  it('缺少历史记录按 0 处理(新用户永不触发)', () => {
    expect(shouldPauseNewWords(13, [])).toBe(false)
  })
})
