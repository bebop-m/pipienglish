// 今日队列规则单测:复习上限 / 新词上限 / 时长估算(SPEC §5.1,F4-CHG-034)

import { describe, expect, it } from 'vitest'
import { buildPlan, estimatedMinutes, NEW_PER_DAY, REVIEW_CAP, totalItems } from './dailyPlan'

const ids = (n: number, prefix = 'w') => Array.from({ length: n }, (_, i) => `${prefix}${i}`)

describe('buildPlan', () => {
  it('常量即裁决:每天 2 个新词、最多 12 张复习', () => {
    expect(NEW_PER_DAY).toBe(2)
    expect(REVIEW_CAP).toBe(12)
  })

  it('复习 ≤12 最过期优先,新词固定 2 个按投放顺序', () => {
    const plan = buildPlan({ dueByOverdue: ids(20, 'r'), unlearned: ids(9, 'n') })
    expect(plan.reviewIds).toEqual(ids(12, 'r'))
    expect(plan.newIds).toEqual(['n0', 'n1'])
    expect(totalItems(plan)).toBe(16)
  })

  it('积压再大也不暂停新词:到期 60 个仍是 12 复习 + 2 新词', () => {
    const plan = buildPlan({ dueByOverdue: ids(60, 'r'), unlearned: ids(9, 'n') })
    expect(plan.reviewIds).toHaveLength(12)
    expect(plan.newIds).toHaveLength(2)
  })

  it('词库学完时新词为空,复习照常', () => {
    const plan = buildPlan({ dueByOverdue: ids(3, 'r'), unlearned: [] })
    expect(plan.newIds).toEqual([])
    expect(plan.reviewIds).toEqual(ids(3, 'r'))
  })

  it('时长估算:新词 2 分钟、复习默写 0.6 分钟,最少 3 分钟', () => {
    expect(estimatedMinutes({ reviewIds: ids(12), newIds: ids(2) })).toBe(11)
    expect(estimatedMinutes({ reviewIds: ids(5), newIds: ids(2) })).toBe(7)
    expect(estimatedMinutes({ reviewIds: [], newIds: [] })).toBe(3)
  })
})
