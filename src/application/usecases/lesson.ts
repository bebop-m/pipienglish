// 学习流用例:计划构建/断点恢复/事件执行(取代 v0.1 的 usecases/study.ts)
// 领域规则见 domain/lesson.ts;本文件只做持久化协调与副作用执行

import type { PipiDB } from '../db'
import { getKV, setKV } from '../db'
import {
  applyLessonEvent,
  buildLessonPlan,
  type LessonEvent,
  type LessonProgress,
  newLessonProgress,
} from '../../domain/lesson'
import { newCard, rate } from '../../domain/srs'
import { dayKeyOf } from '../../domain/time'
import { WORDS, WORD_MAP } from '../../domain/words'
import { assembleLessonVM, type LessonViewModel } from '../lessonViewModel'

const kvKey = (date: string) => `lesson:${date}`

export interface LessonDeps {
  /** 注入 farmHome 用例的 completeDailyLesson(发蛋 + 连胜,幂等),避免规则两处实现 */
  completeDailyLesson(now?: number): Promise<void>
  /** 注入 TTS(services/tts 的 speak);全局音频原则(SPEC §2.6)由本用例统一执行,视觉层不用管 */
  speak?(text: string): void
}

export function createLessonUsecases(d: PipiDB, deps: LessonDeps) {
  /**
   * 取今日课程(断点恢复):有落库进度直接续;没有则从今日会话构建计划并落库。
   * 前置:clockGuard 已保障今日 session 存在。顺手清掉隔天的旧断点。
   */
  async function loadToday(now = Date.now()): Promise<LessonProgress> {
    const date = dayKeyOf(now)
    await d.kv
      .where('key')
      .startsWith('lesson:')
      .and(row => row.key !== kvKey(date))
      .delete()

    const existing = await getKV<LessonProgress | null>(d, kvKey(date), null)
    if (existing && existing.version === 1 && existing.date === date) return existing

    const session = await d.sessions.get(date)
    if (!session) throw new Error('今日会话不存在:请先运行 clockGuard')

    const cards = await d.cards.bulkGet(session.reviewIds)
    const steps = buildLessonPlan(
      {
        date,
        reviewCards: session.reviewIds.map((wordId, i) => ({
          wordId,
          stability: cards[i]?.card.stability ?? 0,
          lastQuizType: cards[i]?.lastQuizType,
        })),
        newIds: session.newIds,
      },
      WORD_MAP,
      WORDS,
    )
    const progress = newLessonProgress(date, steps)
    await setKV(d, kvKey(date), progress)
    return progress
  }

  /**
   * 执行一个学习事件:归约 → 事务内执行副作用 → 持久化断点。
   * 每答一步都落库,中途崩溃重开即从当前步继续(SPEC/架构方案 §7.3)。
   */
  async function dispatch(event: LessonEvent, now = Date.now()): Promise<LessonProgress> {
    const date = dayKeyOf(now)
    const progress = await getKV<LessonProgress | null>(d, kvKey(date), null)
    if (!progress) throw new Error('今日课程未加载:请先调用 loadToday')

    const { progress: next, effects } = applyLessonEvent(progress, event)
    if (next === progress) return progress // 事件与当前步不匹配(双击/迟到),忽略

    let completed = false
    const playIds: string[] = []
    let doneDelta = 0
    let answeredDelta = 0
    let correctDelta = 0

    await d.transaction('rw', d.cards, d.sessions, d.seen, d.rescue, d.kv, async () => {
      for (const fx of effects) {
        switch (fx.type) {
          case 'RATE': {
            const existing = await d.cards.get(fx.wordId)
            const card = rate(existing ? existing.card : newCard(), fx.know)
            await d.cards.put({
              wordId: fx.wordId,
              due: card.due.getTime(),
              card,
              lastQuizType: fx.quizKind ?? existing?.lastQuizType,
            })
            break
          }
          case 'SEEN':
            await d.seen.put({ wordId: fx.wordId, lastSeenAt: now })
            break
          case 'RESCUE':
            await d.rescue.put({ wordId: fx.wordId, capturedAt: now })
            break
          case 'PROGRESS':
            doneDelta += 1
            break
          case 'ANSWERED':
            answeredDelta += 1
            if (fx.correct) correctDelta += 1
            break
          case 'PLAY_WORD':
            playIds.push(fx.wordId)
            break
          case 'COMPLETED':
            completed = true
            break
        }
      }
      if (doneDelta || answeredDelta) {
        const session = await d.sessions.get(date)
        if (session) {
          session.doneCount += doneDelta
          session.answered += answeredDelta
          session.correct += correctDelta
          await d.sessions.put(session)
        }
      }
      await setKV(d, kvKey(date), next)
    })

    // 副作用出事务:发音(不阻塞、不回滚)与发蛋连胜(自身幂等)
    for (const id of playIds) {
      const word = WORD_MAP.get(id)
      if (word) deps.speak?.(word.word)
    }
    if (completed) await deps.completeDailyLesson(now)
    return next
  }

  // 字迹保存已按 F4-CHG-012 裁决取消(默写为标准文本输入,描红不留档);ink 表保留备 v0.3 再议

  /** 视觉层入口:当前卡片 VM(不存在今日进度时自动构建) */
  async function loadViewModel(now = Date.now()): Promise<LessonViewModel> {
    const progress = await loadToday(now)
    const session = await d.sessions.get(progress.date)
    return assembleLessonVM(progress, WORD_MAP, {
      newIds: session?.newIds ?? [],
      reviewIds: session?.reviewIds ?? [],
      newWordsPaused: session?.newWordsPaused,
    })
  }

  return { loadToday, dispatch, loadViewModel }
}

export type LessonUsecases = ReturnType<typeof createLessonUsecases>
