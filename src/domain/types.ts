// 领域类型:零依赖,禁止 import Dexie/React/图片路径/CSS

export interface StagePoint {
  x: number // 1194×834 逻辑坐标
  y: number
}

export type CookingState = 'empty' | 'raw' | 'cooking' | 'ready'

export interface IncubatingEgg {
  slot: 0 | 1 | 2
  placedAt: number // 毫秒时间戳;孵化 = placedAt + HATCH_MS(V-1 裁决:固定 24 小时)
}

export interface FarmState {
  henName: string | null
  eggStock: number // 未分配的蛋,无上限(永不惩罚:不没收、不过期)
  incubating: IncubatingEgg[]
  cooking: CookingState // 锅的持久状态;'cooking' 动画态不落库(崩溃恢复为 raw)
}

export interface Chick {
  chickId: string
  bornOn: string // 孵化日 dayKey
  source: 'hatch' | 'migration'
  homeX: number | null // 手动拖放后的散步中心(逻辑坐标);null = 视觉层分区安排
  homeY: number | null
}

export interface MetaState {
  streak: number
  lastDoneDate: string | null
  totalDays: number
  installDate: string
}

export interface Settings {
  motionEnabled: boolean
  musicEnabled?: boolean // 农场背景音乐(2026-07-19 小皮需求);旧记录缺省按开
}

export interface DailySession {
  date: string // dayKey
  reviewIds: string[]
  newIds: string[]
  doneCount: number
  answered: number
  correct: number
  completed: boolean
  dueBacklog?: number // 构建当日队列时的到期总数(供 SPEC §5.1 连续积压判定;旧记录缺省按 0)
  newWordsPaused?: boolean // 当日新词是否因积压暂停(文案归视觉层)
  gameEggs?: number // 今日写词游戏已领奖励蛋数(日上限 GAME_EGGS_DAILY_CAP;旧记录缺省 0)
}

export const HATCH_MS = 24 * 60 * 60 * 1000
export const HATCHERY_SLOTS = 1
export const VISIBLE_CHICK_CAP = 40
export const FAVORITE_CHICK_CAP = 8
