// 正式学习流规则(SPEC §2.2 新词三步+收尾默写 / §2.5 想不起来 / §2.6 全局音频 / §5.2 题型矩阵 / §5.3 队列安排)
// 纯规则:计划构建 + 事件归约,全部可 JSON 序列化 —— 断点恢复 = 直接落库/读回 LessonProgress
// 领域层零依赖:副作用以 LessonEffect 描述,由 application/usecases/lesson 执行
//
// 阶段 H 定稿的交互语义(与小皮批准的 H-3/H-4/H-5 一致):
// - 答错 = 原地重试:留在本题重听重选/重写,直到答对或"想不起来";不做队尾重考
// - FSRS 每词每日只评一次:首次作答定调(对→Good,错→Again),后续重试不再写入
// - 默写为标准英文文本输入 + 客观判定(F4-CHG-012);判定在视觉层完成,这里只收 correct

import type { Word } from './words/types'

export const DICTATION_STABILITY_DAYS = 7 // stability ≥ 7 天 → 默写复习(SPEC §5.3)
export const DICTATION_DAILY_CAP = 3 // 默写类复习每日上限,超出降级为选择题(控时阀门)
export const WARMUP_COUNT = 3 // 开局热身:记忆强度最高的前 3 张(连对入状态)
export const QUIZ_OPTIONS = 4 // 选择/听音:1 正确 + 3 干扰

export type QuizKind = 'choice' | 'listening'

/**
 * 步骤类型 ↔ 卡片(阶段 H 已批准生产组件):
 * intro=听看卡(H-1) trace=描红卡(H-2) choice=选择题卡(H-3) listening=听音卡(H-4)
 * dictation=默写卡(H-5,复习入 FSRS) closing=收尾默写(复用 H-5 卡,不入 FSRS 不计分)
 */
export type LessonStepType = 'intro' | 'trace' | 'choice' | 'listening' | 'dictation' | 'closing'
export type LessonPhase = 'review' | 'new' | 'closing'

export interface LessonStep {
  stepId: string // `${type}:${wordId}`,计划内唯一
  type: LessonStepType
  phase: LessonPhase
  wordId: string
  /** true = 首次作答写入 FSRS(closing 恒为 false) */
  scored: boolean
  /** 已答错过(原地重试中):FSRS 已记 Again,后续对错都不再写入 */
  attempted: boolean
  options?: string[] // choice/listening:4 个中文释义,计划期生成 —— 断点恢复后选项不变
}

export interface ReviewCardInfo {
  wordId: string
  stability: number
  lastQuizType?: QuizKind // 上次低熟练复习的题型,用于选择/听音交替(SPEC §5.3)
}

export interface LessonPlanInput {
  date: string // dayKey;同日重建计划完全一致(乱序/干扰项均以此为种子)
  reviewCards: ReviewCardInfo[] // session.reviewIds 顺序(最过期优先)
  newIds: string[] // session.newIds 顺序(词库投放顺序)
}

export interface LessonProgress {
  version: 1
  date: string
  steps: LessonStep[] // 固定计划队列(原地重试,不追加步骤)
  cursor: number // 当前步下标;≥ steps.length 即全部完成
  answered: number // 客观题作答次数(含重试,不含收尾;供战报正确率)
  correct: number
  forgotten: string[] // 本课点过"想不起来"的词(去重)
}

export type LessonEvent =
  | { type: 'STEP_DONE' } // intro"我认识它了" / trace"写好了"
  | { type: 'ANSWER'; correct: boolean } // choice/listening 选项判定、dictation/closing 文本判定(视觉层客观判分)
  | { type: 'FORGOT' } // dictation/closing 的"想不起来"(H-5D:小鸡被抓 → 救援)

export type LessonEffect =
  | { type: 'RATE'; wordId: string; know: boolean; quizKind?: QuizKind } // 写 FSRS;quizKind 存卡上供明日交替
  | { type: 'SEEN'; wordId: string } // 更新"上次见面时间"(SPEC §2.4 全系统共享)
  | { type: 'RESCUE'; wordId: string } // 进救援队列(SPEC §2.5;救援屏走"听写选默"四段,后续屏)
  | { type: 'PLAY_WORD'; wordId: string } // 全局音频原则(SPEC §2.6):答对/书写完成即播
  | { type: 'PROGRESS' } // session.doneCount +1;口径 = 复习×1 + 新词(见面+自测)×2,与首页 VM/蛋阈值一致
  | { type: 'ANSWERED'; correct: boolean } // session.answered/correct(含重试,不含收尾)
  | { type: 'COMPLETED' } // 队列清空 → application 调 completeDailyLesson(发蛋+连胜)

// ---------- 确定性随机(断点恢复与测试可重放) ----------

/** 字符串 → 32 位种子(xmur3 简化版) */
export function seedOf(text: string): number {
  let h = 1779033703 ^ text.length
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return (h ^= h >>> 16) >>> 0
}

/** mulberry32:小而稳定的伪随机数生成器 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ---------- 计划构建 ----------

/** 复习题型分配(SPEC §5.3):熟卡默写(每日 ≤3,超出降级选择);生卡选择/听音交替 */
export function assignReviewTypes(cards: readonly ReviewCardInfo[]): Map<string, LessonStepType> {
  const types = new Map<string, LessonStepType>()
  let dictationUsed = 0
  for (const card of cards) {
    if (card.stability >= DICTATION_STABILITY_DAYS && dictationUsed < DICTATION_DAILY_CAP) {
      types.set(card.wordId, 'dictation')
      dictationUsed += 1
    } else {
      types.set(card.wordId, card.lastQuizType === 'choice' ? 'listening' : 'choice')
    }
  }
  return types
}

/** 选择/听音的 4 个中文选项:干扰项优先同包同级,按释义去重,不足回退全库同级再全库 */
export function buildOptions(word: Word, pool: readonly Word[], rng: () => number): string[] {
  const tiers: Array<(c: Word) => boolean> = [
    c => c.pack === word.pack && c.level === word.level,
    c => c.level === word.level,
    () => true,
  ]
  const picked: string[] = []
  const used = new Set([word.meaning])
  for (const fits of tiers) {
    if (picked.length >= QUIZ_OPTIONS - 1) break
    const candidates = shuffle(pool.filter(c => c.id !== word.id && fits(c) && !used.has(c.meaning)), rng)
    for (const c of candidates) {
      if (picked.length >= QUIZ_OPTIONS - 1) break
      picked.push(c.meaning)
      used.add(c.meaning)
    }
  }
  return shuffle([word.meaning, ...picked], rng)
}

/**
 * 构建今日课程计划(确定性:同 date 同输入 → 同计划):
 * 复习(热身 3 张按记忆强度降序 + 其余乱序)→ 新词三步(听看/描红/选择)→ 收尾默写 ×N
 */
export function buildLessonPlan(
  input: LessonPlanInput,
  wordMap: ReadonlyMap<string, Word>,
  pool: readonly Word[],
): LessonStep[] {
  const rng = mulberry32(seedOf(`lesson:${input.date}`))
  const steps: LessonStep[] = []

  const push = (type: LessonStepType, phase: LessonPhase, wordId: string, scored: boolean) => {
    const word = wordMap.get(wordId)
    const needsOptions = type === 'choice' || type === 'listening'
    steps.push({
      stepId: `${type}:${wordId}`,
      type,
      phase,
      wordId,
      scored,
      attempted: false,
      ...(needsOptions && word ? { options: buildOptions(word, pool, rng) } : {}),
    })
  }

  // 复习:热身 = 记忆强度最高的前 3 张;其余乱序打散(拆开同日学的词)
  const types = assignReviewTypes(input.reviewCards)
  const byStability = input.reviewCards.slice().sort((a, b) => b.stability - a.stability)
  const warmup = byStability.slice(0, WARMUP_COUNT)
  const rest = shuffle(byStability.slice(WARMUP_COUNT), rng)
  for (const card of [...warmup, ...rest]) {
    push(types.get(card.wordId) ?? 'choice', 'review', card.wordId, true)
  }

  // 新词三步(投放顺序):听看卡 → 描红 → 选择题自测
  for (const wordId of input.newIds) {
    push('intro', 'new', wordId, false)
    push('trace', 'new', wordId, false)
    push('choice', 'new', wordId, true)
  }

  // 收尾·今日默写:全部新词学完后各写一遍(间隔提取 + 签到仪式,不入 FSRS 不计分)
  for (const wordId of input.newIds) {
    push('closing', 'closing', wordId, false)
  }

  return steps
}

export function newLessonProgress(date: string, steps: LessonStep[]): LessonProgress {
  return { version: 1, date, steps, cursor: 0, answered: 0, correct: 0, forgotten: [] }
}

// ---------- 事件归约 ----------

const ACCEPTS: Record<LessonStepType, LessonEvent['type'][]> = {
  intro: ['STEP_DONE'],
  trace: ['STEP_DONE'],
  choice: ['ANSWER'],
  listening: ['ANSWER'],
  dictation: ['ANSWER', 'FORGOT'],
  closing: ['ANSWER', 'FORGOT'],
}

const quizKindOf = (t: LessonStepType): QuizKind | undefined =>
  t === 'choice' || t === 'listening' ? t : undefined

/** doneCount 口径:复习 ×1 + 新词(听看 intro、自测 choice)×2;描红/收尾不计 */
const countsProgress = (step: LessonStep) =>
  step.phase === 'review' || step.type === 'intro' || (step.phase === 'new' && step.type === 'choice')

/**
 * 纯归约:当前步 + 事件 → 新进度 + 副作用列表。
 * 答错原地重试(cursor 不动,标记 attempted);答对/完成/想不起来才前进。
 * 事件与当前步不匹配时原样返回(防御双击/迟到事件)。
 */
export function applyLessonEvent(
  progress: LessonProgress,
  event: LessonEvent,
): { progress: LessonProgress; effects: LessonEffect[] } {
  const step = progress.steps[progress.cursor]
  if (!step || !ACCEPTS[step.type].includes(event.type)) return { progress, effects: [] }

  const effects: LessonEffect[] = [{ type: 'SEEN', wordId: step.wordId }]
  let steps = progress.steps
  let { answered, correct } = progress
  const forgotten = progress.forgotten.slice()
  let advance = false

  switch (event.type) {
    case 'STEP_DONE': {
      // 描红"写好了"= 书写完成 → 自动播发音(SPEC §2.6);听看卡进场自动播 ×2 归视觉层
      if (step.type === 'trace') effects.push({ type: 'PLAY_WORD', wordId: step.wordId })
      advance = true
      break
    }
    case 'ANSWER': {
      if (step.type !== 'closing') {
        answered += 1
        if (event.correct) correct += 1
        effects.push({ type: 'ANSWERED', correct: event.correct })
      }
      // FSRS 每词每日一评:首次作答定调,重试不再写入
      if (step.scored && !step.attempted) {
        effects.push({ type: 'RATE', wordId: step.wordId, know: event.correct, quizKind: quizKindOf(step.type) })
      }
      if (event.correct) {
        effects.push({ type: 'PLAY_WORD', wordId: step.wordId }) // 答对/写对即播
        advance = true
      } else if (!step.attempted) {
        steps = steps.map((s, i) => (i === progress.cursor ? { ...s, attempted: true } : s))
      }
      break
    }
    case 'FORGOT': {
      // 想不起来(SPEC §2.5 / H-5D):不揭示答案、跳过本题、小鸡被抓进救援
      if (step.type !== 'closing') {
        answered += 1
        effects.push({ type: 'ANSWERED', correct: false })
        if (step.scored && !step.attempted) {
          effects.push({ type: 'RATE', wordId: step.wordId, know: false, quizKind: quizKindOf(step.type) })
        }
      }
      effects.push({ type: 'RESCUE', wordId: step.wordId })
      if (!forgotten.includes(step.wordId)) forgotten.push(step.wordId)
      advance = true
      break
    }
  }

  let cursor = progress.cursor
  if (advance) {
    if (countsProgress(step)) effects.push({ type: 'PROGRESS' })
    cursor += 1
    if (cursor >= steps.length) effects.push({ type: 'COMPLETED' })
  }

  return { progress: { ...progress, steps, cursor, answered, correct, forgotten }, effects }
}

export function lessonFinished(progress: LessonProgress): boolean {
  return progress.cursor >= progress.steps.length
}
