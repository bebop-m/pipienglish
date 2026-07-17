import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../../application/db'
import { speak } from '../../application/services/tts'
import { createRescueUsecases, type RescueViewModel } from '../../application/usecases/rescue'

const rescue = createRescueUsecases(db)

export interface RescueBridge {
  vm: RescueViewModel | null
  stepDone: (stage: 'intro' | 'trace') => Promise<void>
  answerChoice: (selectedId: string) => Promise<boolean>
  answerDictation: (value: string) => Promise<boolean>
  next: () => Promise<void>
}

export function useRescue(): RescueBridge {
  const [vm, setVm] = useState<RescueViewModel | null>(null)
  const alive = useRef(true)
  const pendingDictation = useRef<string | null>(null)
  const pendingAnswer = useRef<Promise<void>>(Promise.resolve())

  const refresh = useCallback(async () => {
    const next = await rescue.loadViewModel()
    if (alive.current) setVm(next)
  }, [])

  useEffect(() => {
    alive.current = true
    refresh()
    return () => { alive.current = false }
  }, [refresh])

  const stepDone = useCallback(async (stage: 'intro' | 'trace') => {
    const advanced = await rescue.completePassiveStep(stage)
    if (advanced && stage === 'trace' && vm?.word) speak(vm.word.word)
    await refresh()
  }, [refresh, vm?.word])

  const answerChoice = useCallback((selectedId: string) => {
    const operation = rescue.submitChoice(selectedId).then(correct => {
      if (correct && vm?.word) speak(vm.word.word)
      return correct
    })
    pendingAnswer.current = operation.then(() => undefined)
    return operation
  }, [vm?.word])

  const answerDictation = useCallback((value: string) => {
    const operation = rescue.submitDictation(value).then(correct => {
      pendingDictation.current = correct ? value : null
      if (correct && vm?.word) speak(vm.word.word)
      return correct
    })
    pendingAnswer.current = operation.then(() => undefined)
    return operation
  }, [vm?.word])

  const next = useCallback(async () => {
    await pendingAnswer.current // 防止答对后立即点“继续”跑在 IndexedDB 持久化之前
    if (pendingDictation.current !== null) {
      const value = pendingDictation.current
      pendingDictation.current = null
      await rescue.confirmDictation(value)
    }
    await refresh()
  }, [refresh])

  return { vm, stepDone, answerChoice, answerDictation, next }
}
