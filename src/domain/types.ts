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
}

export interface DailySession {
  date: string // dayKey
  reviewIds: string[]
  newIds: string[]
  doneCount: number
  answered: number
  correct: number
  completed: boolean
}

export const HATCH_MS = 24 * 60 * 60 * 1000
export const HATCHERY_SLOTS = 3
export const VISIBLE_CHICK_CAP = 40
