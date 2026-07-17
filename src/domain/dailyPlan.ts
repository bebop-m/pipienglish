// 今日队列构建规则(SPEC §5.1/§5.3)
// 题型分配与热身排序在 domain/lesson.ts(学习流规则);本文件只管"今天取哪些词"

export const NEW_PER_DAY = 4 // 硬上限,不是下限(SPEC §0)
export const REVIEW_CAP = 6 // 复习债上限,积压顺延且永不展示总数(2026-07-17 爸爸定:6+4,与写词游戏每轮 10 一致)
export const BACKLOG_PAUSE_THRESHOLD = REVIEW_CAP * 2 // 积压超过两倍日容量(SPEC §5.1)
export const PAUSE_MAX_DAYS = 2 // 新词最多连停 2 天,之后照常投放(永不惩罚:不无限饿着新朋友)

export interface RecentBacklog {
  backlog: number // 当日构建队列时的到期总数(含顺延部分)
  paused: boolean // 当日是否因积压暂停了新词
}

export interface PlanInput {
  dueByOverdue: string[] // 到期卡 wordId,最过期优先
  unlearned: string[] // 尚无卡片的词,按词库投放顺序
  backlogToday: number // 今日到期总数(= dueByOverdue.length,单独传入便于测试)
  recentBacklogs: RecentBacklog[] // [昨天, 前天];缺记录用 {backlog:0, paused:false}
}

export interface DailyPlan {
  reviewIds: string[]
  newIds: string[]
  newWordsPaused: boolean // 文案由视觉层出("今天母鸡想多陪陪老朋友"),此处只给事实
}

/** SPEC §5.1:连续 3 天到期 >12 → 自动暂停新词;已连停 2 天则恢复 */
export function shouldPauseNewWords(backlogToday: number, recent: RecentBacklog[]): boolean {
  const [d1, d2] = [recent[0] ?? { backlog: 0, paused: false }, recent[1] ?? { backlog: 0, paused: false }]
  const overloadedThreeDays =
    backlogToday > BACKLOG_PAUSE_THRESHOLD &&
    d1.backlog > BACKLOG_PAUSE_THRESHOLD &&
    d2.backlog > BACKLOG_PAUSE_THRESHOLD
  const pausedTwoDays = d1.paused && d2.paused
  return overloadedThreeDays && !pausedTwoDays
}

export function buildPlan(input: PlanInput): DailyPlan {
  const paused = shouldPauseNewWords(input.backlogToday, input.recentBacklogs)
  return {
    reviewIds: input.dueByOverdue.slice(0, REVIEW_CAP),
    newIds: paused ? [] : input.unlearned.slice(0, NEW_PER_DAY),
    newWordsPaused: paused,
  }
}

/** 任务项总数:复习 ×1 + 新词 ×2(见面 + 自测)——与 session.doneCount 口径一致 */
export function totalItems(plan: { reviewIds: string[]; newIds: string[] }): number {
  return plan.reviewIds.length + plan.newIds.length * 2
}

export function estimatedMinutes(plan: { reviewIds: string[]; newIds: string[] }): number {
  return Math.max(3, Math.round((plan.reviewIds.length + plan.newIds.length * 2) * 0.5))
}
