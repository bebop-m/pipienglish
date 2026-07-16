// 学习流用例(逻辑保留自 v0.1;UI 在"学习流"页面阶段由 Codex 按 F4 新建)
// 题型矩阵(SPEC §5.2)与热身排序(§5.3)在该页面阶段接入,规则进 domain/dailyPlan

import type { PipiDB } from '../db'
import type { DailySession } from '../../domain/types'
import { newCard, rate } from '../../domain/srs'
import { dayKeyOf } from '../../domain/time'

export interface StudyItem {
  type: 'review' | 'learn' | 'quiz'
  wordId: string
}

export function buildItems(session: DailySession): StudyItem[] {
  const items: StudyItem[] = []
  for (const id of session.reviewIds) items.push({ type: 'review', wordId: id })
  for (const id of session.newIds) {
    items.push({ type: 'learn', wordId: id })
    items.push({ type: 'quiz', wordId: id })
  }
  return items
}

export function createStudyUsecases(d: PipiDB) {
  /** 答一张复习/自测卡:更新 FSRS、会话计数与"见面时间" */
  async function answer(item: StudyItem, know: boolean, now = Date.now()): Promise<void> {
    const existing = await d.cards.get(item.wordId)
    const card = rate(existing ? existing.card : newCard(), know)
    await d.transaction('rw', d.cards, d.sessions, d.seen, async () => {
      await d.cards.put({ wordId: item.wordId, due: card.due.getTime(), card })
      await d.seen.put({ wordId: item.wordId, lastSeenAt: now })
      const session = await d.sessions.get(dayKeyOf(now))
      if (session) {
        session.answered += 1
        if (know) session.correct += 1
        session.doneCount += 1
        await d.sessions.put(session)
      }
    })
  }

  /** "忘记了"(SPEC §2.5):Again + 跳过,进救援队列,不队尾重考 */
  async function forgot(item: StudyItem, now = Date.now()): Promise<void> {
    const existing = await d.cards.get(item.wordId)
    const card = rate(existing ? existing.card : newCard(), false)
    await d.transaction('rw', d.cards, d.sessions, d.seen, d.rescue, async () => {
      await d.cards.put({ wordId: item.wordId, due: card.due.getTime(), card })
      await d.seen.put({ wordId: item.wordId, lastSeenAt: now })
      await d.rescue.put({ wordId: item.wordId, capturedAt: now })
      const session = await d.sessions.get(dayKeyOf(now))
      if (session) {
        session.answered += 1
        session.doneCount += 1
        await d.sessions.put(session)
      }
    })
  }

  /** 学完一个新词的见面步骤(learn 不评分,只推进度) */
  async function advance(now = Date.now()): Promise<void> {
    const session = await d.sessions.get(dayKeyOf(now))
    if (session) {
      session.doneCount += 1
      await d.sessions.put(session)
    }
  }

  /** 救援补写成功:小鸡回家;不入 FSRS,只更新见面时间(SPEC §2.5) */
  async function rescueDone(wordId: string, now = Date.now()): Promise<void> {
    await d.transaction('rw', d.rescue, d.seen, async () => {
      await d.rescue.delete(wordId)
      await d.seen.put({ wordId, lastSeenAt: now })
    })
  }

  return { answer, forgot, advance, rescueDone }
}

export type StudyUsecases = ReturnType<typeof createStudyUsecases>
