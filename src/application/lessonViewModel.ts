// 学习流只读 ViewModel(契约 §4;阶段 H 已批准组件按此消费真实数据)
// 卡片视觉与交互态(答对/重试/被抓)由 H-1~H-5 生产组件自管;这里只给数据与判定基准

import type { LessonEvent, LessonPhase, LessonProgress, LessonStepType } from '../domain/lesson'
import { lessonFinished } from '../domain/lesson'
import type { Word } from '../domain/words/types'

export type { LessonEvent, LessonPhase, LessonStepType }

export interface LessonWordVM {
  id: string
  word: string
  ipa: string
  meaning: string
  sentence: string
  sentenceCn: string
  emoji: string // 仅限内部开发壳;孩子可见组件按 imageAssetId 走登记插图,缺图用无图版(H-1B)
  imageAssetId?: string
}

/** 选择/听音选项:id 为步骤内稳定序号,不携带英文(H-3/H-4 防泄题边界) */
export interface LessonOptionVM {
  id: string
  label: string
}

export interface LessonStepVM {
  stepId: string
  type: LessonStepType
  phase: LessonPhase // review = 老朋友;new = 新朋友三步;closing = 收尾默写
  word: LessonWordVM
  options?: LessonOptionVM[] // choice/listening(计划期生成,断点恢复后不变)
  correctOptionId?: string
  /** 头部序号:新词三步 = 第 1/2/3 步;其余 = 同类型第 x 题 / 共 N 题 */
  stepOrdinal: number
  stepOrdinalTotal: number
}

export interface LessonSummaryVM {
  newWords: number // 结束页战报:今天认识 X 个新朋友
  reviews: number // 复习 Y 个老朋友
  answered: number // 客观题作答次数(含重试,不含收尾)
  correctRate: number // 0~1;answered=0 时为 1
  forgotten: number // 进入救援队列的词数(结束页不渲染,供家长页)
}

export interface LessonViewModel {
  hydrated: boolean
  date: string
  doneSteps: number // 今日进度(按步):cursor / steps.length,原地重试不改变分母
  totalSteps: number
  current: LessonStepVM | null // null = 已全部完成(finished)
  finished: boolean
  newWordsPaused: boolean // 今日新词因积压暂停(文案归视觉层,S-3 待定稿)
  summary: LessonSummaryVM
}

const NEW_TRIPLE_ORDINAL: Partial<Record<LessonStepType, number>> = { intro: 1, trace: 2, choice: 3 }

export function assembleLessonVM(
  progress: LessonProgress,
  wordMap: ReadonlyMap<string, Word>,
  session: { newIds: string[]; reviewIds: string[]; newWordsPaused?: boolean },
): LessonViewModel {
  const finished = lessonFinished(progress)
  const step = finished ? null : progress.steps[progress.cursor]
  const word = step ? wordMap.get(step.wordId) : undefined

  let current: LessonStepVM | null = null
  if (step && word) {
    // 序号:新词三步固定 1/2/3;复习与收尾按同类型题目排序
    let stepOrdinal: number
    let stepOrdinalTotal: number
    if (step.phase === 'new') {
      stepOrdinal = NEW_TRIPLE_ORDINAL[step.type] ?? 1
      stepOrdinalTotal = 3
    } else {
      const sameType = progress.steps.filter(s => s.type === step.type)
      stepOrdinal = sameType.findIndex(s => s.stepId === step.stepId) + 1
      stepOrdinalTotal = sameType.length
    }

    const options = step.options?.map((label, index) => ({ id: `opt-${index}`, label }))
    const correctIndex = step.options?.indexOf(word.meaning) ?? -1

    current = {
      stepId: step.stepId,
      type: step.type,
      phase: step.phase,
      word: {
        id: word.id,
        word: word.word,
        ipa: word.ipa,
        meaning: word.meaning,
        sentence: word.sentence,
        sentenceCn: word.sentenceCn,
        emoji: word.emoji,
        imageAssetId: word.imageAssetId,
      },
      options,
      correctOptionId: correctIndex >= 0 ? `opt-${correctIndex}` : undefined,
      stepOrdinal,
      stepOrdinalTotal,
    }
  }

  return {
    hydrated: true,
    date: progress.date,
    doneSteps: Math.min(progress.cursor, progress.steps.length),
    totalSteps: progress.steps.length,
    finished,
    newWordsPaused: session.newWordsPaused ?? false,
    current,
    summary: {
      newWords: session.newIds.length,
      reviews: session.reviewIds.length,
      answered: progress.answered,
      correctRate: progress.answered === 0 ? 1 : progress.correct / progress.answered,
      forgotten: progress.forgotten.length,
    },
  }
}
