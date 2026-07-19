// 学习流视觉桥:VM 订阅 + 事件分发(useFarmHome 同款模式)。
// H-1~H-6 组件只 import 本 Hook 与 lessonViewModel 类型,不得直接触碰 Dexie/FSRS(契约 §7)。
//
// 与阶段 H 交互语义的对齐:组件内部自管答对/重试/被抓画面,所以——
// - answer():只落库判定与 FSRS,不刷新 VM(避免答对态还没点"继续"就切卡)
// - forgot():落库救援,不刷新(H-5D 被抓画面停留到"先做下一题")
// - stepDone()/next():前进/确认后刷新 VM,推动到下一张卡或结束页

import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../../application/db'
import { createFarmUsecases } from '../../application/usecases/farmHome'
import { createLessonUsecases } from '../../application/usecases/lesson'
import { speak } from '../../application/services/tts'
import type { LessonViewModel } from '../../application/lessonViewModel'

const farm = createFarmUsecases(db)
const lesson = createLessonUsecases(db, { completeDailyLesson: farm.completeDailyLesson, speak })

/** H-6 结束页战报:课程侧(新词/复习)+ 农场侧(连胜/蛋),完成结算后组装 */
export interface LessonFinishVM {
  dayNumber: number
  newWords: number
  reviews: number
  streakDays: number
  eggsEarned: number
}

export interface LessonBridge {
  vm: LessonViewModel | null
  finish: LessonFinishVM | null // finished 时可用,驱动 LessonFinishScreen
  /** choice/listening/dictation/closing 的每次作答(组件已客观判定) */
  answer: (correct: boolean) => Promise<void>
  /** dictation/closing 的"想不起来"(H-5D 小鸡被抓) */
  forgot: () => Promise<void>
  /** intro"我认识它了" / trace"写好了":完成本步并前进 */
  stepDone: () => Promise<void>
  /** 答对态/被抓态点"继续":前进已落库,这里只把 VM 推到下一张卡 */
  next: () => Promise<void>
}

export function useLesson(): LessonBridge {
  const [vm, setVm] = useState<LessonViewModel | null>(null)
  const [finish, setFinish] = useState<LessonFinishVM | null>(null)
  const alive = useRef(true)
  const stepDonePending = useRef(false)

  const refresh = useCallback(async () => {
    await farm.clockGuard() // 保障今日 session 存在(跨日打开学习页同样安全)
    const next = await lesson.loadViewModel()
    if (!alive.current) return
    setVm(next)
    if (next.finished) {
      // 完成结算(completeDailyLesson)已在最后一次 dispatch 内发生;此处读取农场侧真实数字
      const home = await farm.loadViewModel()
      if (!alive.current) return
      setFinish({
        dayNumber: home.dayNumber,
        newWords: next.summary.newWords,
        reviews: next.summary.reviews,
        streakDays: home.streak,
        eggsEarned: home.eggsEarnedToday,
      })
    } else {
      setFinish(null)
    }
  }, [])

  useEffect(() => {
    alive.current = true
    refresh()
    return () => {
      alive.current = false
    }
  }, [refresh])

  const answer = useCallback(async (correct: boolean) => {
    await lesson.dispatch({ type: 'ANSWER', correct })
  }, [])

  const forgot = useCallback(async () => {
    await lesson.dispatch({ type: 'FORGOT' })
  }, [])

  const stepDone = useCallback(async () => {
    if (stepDonePending.current) return
    stepDonePending.current = true
    try {
      await lesson.dispatch({ type: 'STEP_DONE' })
      await refresh()
    } finally {
      stepDonePending.current = false
    }
  }, [refresh])

  const next = useCallback(async () => {
    await refresh()
  }, [refresh])

  return { vm, finish, answer, forgot, stepDone, next }
}
