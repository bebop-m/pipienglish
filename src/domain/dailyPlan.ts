// 今日队列构建规则(SPEC §5.1/§5.3)
// 热身排序与题型分配在学习流页面阶段引入,规则将只在此文件演进

export const NEW_PER_DAY = 4 // 硬上限,不是下限(SPEC §0)
export const REVIEW_CAP = 6 // 复习债上限,积压顺延且永不展示总数(2026-07-17 爸爸定:6+4,与写词游戏每轮 10 一致)

export interface PlanInput {
  dueByOverdue: string[] // 到期卡 wordId,最过期优先
  unlearned: string[] // 尚无卡片的词,按词库投放顺序
}

export interface DailyPlan {
  reviewIds: string[]
  newIds: string[]
}

export function buildPlan(input: PlanInput): DailyPlan {
  return {
    reviewIds: input.dueByOverdue.slice(0, REVIEW_CAP),
    newIds: input.unlearned.slice(0, NEW_PER_DAY),
  }
}

/** 任务项总数:复习 ×1 + 新词 ×2(见面 + 自测) */
export function totalItems(plan: { reviewIds: string[]; newIds: string[] }): number {
  return plan.reviewIds.length + plan.newIds.length * 2
}

export function estimatedMinutes(plan: { reviewIds: string[]; newIds: string[] }): number {
  return Math.max(3, Math.round((plan.reviewIds.length + plan.newIds.length * 2) * 0.5))
}
