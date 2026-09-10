// 今日队列构建规则(SPEC §5.1/§5.3;F4-CHG-034 重定节奏)
// 题型分配与热身排序在 domain/lesson.ts(学习流规则);本文件只管"今天取哪些词"

export const NEW_PER_DAY = 2 // 硬上限,不是下限(SPEC §0);F4-CHG-034:4 → 2
export const REVIEW_CAP = 12 // 复习债上限,积压顺延且永不展示总数;F4-CHG-034:6 → 12
/** 时长估算口径(分钟):新词 = 听看 + 描红 + 自测 + 收尾默写;复习 = 一张默写卡 */
export const NEW_WORD_MINUTES = 2
export const REVIEW_MINUTES = 0.6

export interface PlanInput {
  dueByOverdue: string[] // 到期卡 wordId,最过期优先
  unlearned: string[] // 尚无卡片的词,按词库投放顺序
}

export interface DailyPlan {
  reviewIds: string[]
  newIds: string[]
}

/**
 * 每天固定 2 个新词 + 最多 12 张最过期优先的复习。
 * 2026-09-10 前的「连续 3 天到期 >12 就暂停新词」规则已删除(F4-CHG-034):
 * 复习上限本身就是时长阀门,暂停只会让新词、描红和收尾默写消失,复习并不因此变快。
 */
export function buildPlan(input: PlanInput): DailyPlan {
  return {
    reviewIds: input.dueByOverdue.slice(0, REVIEW_CAP),
    newIds: input.unlearned.slice(0, NEW_PER_DAY),
  }
}

/** 任务项总数:复习 ×1 + 新词 ×2(见面 + 自测)——与 session.doneCount 口径一致 */
export function totalItems(plan: { reviewIds: string[]; newIds: string[] }): number {
  return plan.reviewIds.length + plan.newIds.length * 2
}

export function estimatedMinutes(plan: { reviewIds: string[]; newIds: string[] }): number {
  return Math.max(3, Math.round(plan.reviewIds.length * REVIEW_MINUTES + plan.newIds.length * NEW_WORD_MINUTES))
}
