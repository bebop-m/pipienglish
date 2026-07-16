// F4 首页只读 ViewModel 与事件契约(架构方案 §4/§5)
// 所有坐标均为 1194×834 逻辑坐标;Codex 视觉层只消费本文件类型

import type { Chick, CookingState, DailySession, FarmState, MetaState, StagePoint } from '../domain/types'
import { VISIBLE_CHICK_CAP } from '../domain/types'
import { estimatedMinutes, totalItems } from '../domain/dailyPlan'
import { eggsEarnedFor, hatchesAt } from '../domain/eggEconomy'
import { dayKeyOf } from '../domain/time'

export type FarmHomeState = 'first_visit' | 'daily_incomplete' | 'daily_complete'
export type FarmOverlay = 'none' | 'egg_panel' | 'hatchery_pop' | 'rescue_pop'

export interface IncubatingEggVM {
  slot: 0 | 1 | 2
  placedAt: number
  hatchesAt: number // 剩余时间 = hatchesAt - now,视觉层在"点蛋"时计算显示(V-1:无常驻倒计时)
}

export interface FarmChickVM {
  chickId: string
  bornOn: string
  home: StagePoint | null // 手动散步中心;null = 视觉层分区安排
  isNewToday: boolean
}

export interface ChickChatVM {
  primary: { chickId: string; word: string; meaning: string } // 只有它播 TTS
  others: Array<{ chickId: string; word: string; meaning: string }>
  expiresAt: number
}

export interface FarmHomeViewModel {
  hydrated: boolean
  state: FarmHomeState
  dayNumber: number
  streak: number
  henName: string | null
  learnedToday: number // 已完成的复习词 + 已完成见面/自测的新词,用于任务板“朋友”进度
  newWordsLearnedToday: number // 仅新词,用于顶栏“今日单词”
  dailyTarget: number
  reviewCountToday: number
  totalItemsToday: number
  estimatedMinutes: number
  eggStock: number
  eggsEarnedToday: number // 完成前 = 预告值(任务板「奖励 ×N」),完成后 = 实得值
  incubating: IncubatingEggVM[]
  chicksTotal: number
  chicksVisible: FarmChickVM[]
  chicksInCoop: number
  rescueCount: number
  cooking: CookingState
  overlay: FarmOverlay // 由视觉桥(useFarmHome)本地维护,不持久化
  chat: ChickChatVM | null
  motionEnabled: boolean
}

export type FarmHomeEvent =
  | { type: 'NAME_HEN'; name: string }
  | { type: 'START_DAILY_LESSON' }
  | { type: 'OPEN_HANDWRITING_GAME' }
  | { type: 'DAILY_LESSON_COMPLETED'; newWords: number; reviews: number }
  | { type: 'OPEN_EGG_PANEL' }
  | { type: 'CLOSE_EGG_PANEL' }
  | { type: 'TOGGLE_HATCHERY_POP' }
  | { type: 'TOGGLE_RESCUE_POP' }
  | { type: 'ALLOCATE_EGG_TO_HATCH' }
  | { type: 'PUT_EGG_IN_PAN' }
  | { type: 'START_FRYING' }
  | { type: 'FRYING_DONE' }
  | { type: 'FEED_CHICK'; chickId?: string }
  | { type: 'OPEN_RESCUE' }
  | { type: 'CHICK_CHAT'; chickId: string; neighborIds: string[] }
  | { type: 'CHAT_DISMISSED' }
  | { type: 'CHICK_PLACED'; chickId: string; home: StagePoint }
  | { type: 'SET_MOTION'; enabled: boolean }
  | { type: 'OPEN_PARENT' }

export interface FarmSnapshot {
  farm: FarmState
  meta: MetaState
  motionEnabled: boolean
  session: DailySession
  chicksTotal: number
  latestChicks: Chick[] // 最新 ≤40 只,bornOn 降序
  rescueCount: number
  now: number
}

/** 纯函数:快照 → 核心 VM(overlay/chat 由视觉桥本地合并) */
export function assembleViewModel(s: FarmSnapshot): Omit<FarmHomeViewModel, 'overlay' | 'chat'> {
  const { farm, meta, session } = s
  const state: FarmHomeState =
    farm.henName == null ? 'first_visit' : session.completed ? 'daily_complete' : 'daily_incomplete'
  const items = totalItems(session)
  const reviewDone = Math.min(session.doneCount, session.reviewIds.length)
  const newStepsDone = Math.max(0, session.doneCount - session.reviewIds.length)
  const newWordsLearnedToday = Math.min(session.newIds.length, Math.floor(newStepsDone / 2))
  const today = dayKeyOf(s.now)
  return {
    hydrated: true,
    state,
    dayNumber: meta.totalDays + (session.completed ? 0 : 1),
    streak: meta.streak,
    henName: farm.henName,
    learnedToday: reviewDone + newWordsLearnedToday,
    newWordsLearnedToday,
    dailyTarget: session.newIds.length,
    reviewCountToday: session.reviewIds.length,
    totalItemsToday: session.reviewIds.length + session.newIds.length,
    estimatedMinutes: estimatedMinutes(session),
    eggStock: farm.eggStock,
    eggsEarnedToday: eggsEarnedFor(items),
    incubating: farm.incubating
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map(e => ({ slot: e.slot, placedAt: e.placedAt, hatchesAt: hatchesAt(e.placedAt) })),
    chicksTotal: s.chicksTotal,
    chicksVisible: s.latestChicks.slice(0, VISIBLE_CHICK_CAP).map(c => ({
      chickId: c.chickId,
      bornOn: c.bornOn,
      home: c.homeX != null && c.homeY != null ? { x: c.homeX, y: c.homeY } : null,
      isNewToday: c.bornOn === today,
    })),
    chicksInCoop: Math.max(0, s.chicksTotal - VISIBLE_CHICK_CAP),
    rescueCount: s.rescueCount,
    cooking: farm.cooking,
    motionEnabled: s.motionEnabled,
  }
}
