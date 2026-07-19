// 写词游戏视觉桥(useRescue 同款模式):一轮 ≤10 题,全部复用 H-5 默写卡。
// 视觉组件只消费本 Hook;数据规则见 usecases/handwriting(不写 FSRS,只更新 seen)。

import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../../application/db'
import { speak } from '../../application/services/tts'
import { createHandwritingUsecases } from '../../application/usecases/handwriting'
import { GAME_EGGS_DAILY_CAP } from '../../domain/eggEconomy'
import type { LessonWordVM } from '../../application/lessonViewModel'
import { WORD_MAP } from '../../domain/words'

const usecases = createHandwritingUsecases(db)

export interface HandwritingViewModel {
  hydrated: true
  /** 未解锁(今日必修未完成)或无已学词:容器应直接退出回农场 */
  empty: boolean
  /** 一轮写完(奖励结算已完成):容器退出回农场 */
  done: boolean
  /** 本轮写完是否还有奖励蛋可拿(日上限 10;拿满后照常可玩,纯加练) */
  eggAvailable: boolean
  word: LessonWordVM | null
  index: number // 第 x 题(1 起)
  total: number
}

export interface HandwritingBridge {
  vm: HandwritingViewModel | null
  /** 每次作答(H-5 卡已客观判定);答对记见面时间并播音,答错原地重试无副作用 */
  answer: (correct: boolean) => Promise<void>
  /** "想不起来":进救援 + 见面时间(H-5D 小鸡被抓) */
  forgot: () => Promise<void>
  /** 答对态/被抓态点"继续":推进到下一题;最后一题后结算奖励蛋并标记 done */
  next: () => Promise<void>
}

function toWordVM(wordId: string): LessonWordVM | null {
  const word = WORD_MAP.get(wordId)
  if (!word) return null
  return {
    id: word.id,
    word: word.word,
    ipa: word.ipa,
    meaning: word.meaning,
    sentence: word.sentence,
    sentenceCn: word.sentenceCn,
    emoji: word.emoji,
    imageAssetId: word.imageAssetId,
  }
}

interface RoundState {
  wordIds: string[]
  cursor: number
  done: boolean
  eggAvailable: boolean
}

export function useHandwriting(): HandwritingBridge {
  const [round, setRound] = useState<RoundState | null>(null)
  const roundRef = useRef<RoundState | null>(null) // next() 的同步视图(奖励副作用不能进 setState 更新器)
  const alive = useRef(true)
  const pendingOps = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    alive.current = true
    Promise.all([usecases.buildRound(), usecases.gameEggsToday()]).then(([wordIds, claimed]) => {
      if (!alive.current) return
      const fresh: RoundState = { wordIds, cursor: 0, done: false, eggAvailable: claimed < GAME_EGGS_DAILY_CAP }
      roundRef.current = fresh
      setRound(fresh)
    })
    return () => {
      alive.current = false
    }
  }, [])

  const currentId = round && !round.done ? round.wordIds[round.cursor] ?? null : null

  const answer = useCallback(
    async (correct: boolean) => {
      if (!currentId || !correct) return // 答错原地重试,不落任何数据
      const op = usecases.recordCorrect(currentId).then(() => {
        speak(WORD_MAP.get(currentId)?.word ?? currentId) // 书写完成即播(SPEC §2.6)
      })
      pendingOps.current = op
      await op
    },
    [currentId],
  )

  const forgot = useCallback(async () => {
    if (!currentId) return
    const op = usecases.recordForgot(currentId)
    pendingOps.current = op
    await op
  }, [currentId])

  const next = useCallback(async () => {
    await pendingOps.current // 等落库完成,防"继续"跑在持久化之前
    const prev = roundRef.current
    if (!prev || prev.done) return
    const cursor = prev.cursor + 1
    const done = cursor >= prev.wordIds.length
    const advanced: RoundState = { ...prev, cursor, done }
    roundRef.current = advanced
    if (alive.current) setRound(advanced)
    if (done) await usecases.awardRound() // 完成一轮 → 结算奖励蛋(日上限内 +1,超出静默);ref 保证只结算一次
  }, [])

  const vm: HandwritingViewModel | null = round
    ? {
        hydrated: true,
        empty: round.wordIds.length === 0,
        done: round.done,
        eggAvailable: round.eggAvailable,
        word: currentId ? toWordVM(currentId) : null,
        index: Math.min(round.cursor + 1, Math.max(round.wordIds.length, 1)),
        total: round.wordIds.length,
      }
    : null

  return { vm, answer, forgot, next }
}
