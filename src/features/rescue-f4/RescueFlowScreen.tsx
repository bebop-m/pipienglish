import { useEffect } from 'react'
import { LessonChoiceScreen } from '../lesson-f4/LessonChoiceScreen'
import { LessonDictationScreen } from '../lesson-f4/LessonDictationScreen'
import { LessonIntroScreen } from '../lesson-f4/LessonIntroScreen'
import { LessonTraceScreen } from '../lesson-f4/LessonTraceScreen'
import { useRescue } from './useRescue'

export interface RescueFlowScreenProps {
  onExit: () => void
}

const STEP_CHIPS = {
  intro: '听一听 · 救援',
  trace: '描一描 · 救援',
  choice: '选一选 · 救援',
  dictation: '写一写 · 救援',
} as const

export function RescueFlowScreen({ onExit }: RescueFlowScreenProps) {
  const { vm, stepDone, answerChoice, answerDictation, next } = useRescue()

  useEffect(() => {
    if (vm?.hydrated && vm.empty) onExit()
  }, [onExit, vm?.empty, vm?.hydrated])

  if (!vm || vm.empty || !vm.word) return null

  const common = {
    word: vm.word,
    todayDone: vm.stageIndex - 1,
    todayTotal: vm.stageTotal,
    onBack: onExit,
    headerTitle: `救援 · 第 ${vm.stageIndex} 步 / ${vm.stageTotal}`,
    progressText: `待救 ${vm.queueTotal} 只`,
    stepChip: STEP_CHIPS[vm.stage],
  }

  switch (vm.stage) {
    case 'intro':
      return (
        <LessonIntroScreen
          key={`${vm.word.id}:intro`}
          {...common}
          word={{ ...vm.word, imageAssetId: undefined }}
          stepIndex={vm.stageIndex}
          stepTotal={vm.stageTotal}
          onComplete={() => stepDone('intro')}
        />
      )
    case 'trace':
      return (
        <LessonTraceScreen
          key={`${vm.word.id}:trace`}
          {...common}
          stepIndex={vm.stageIndex}
          stepTotal={vm.stageTotal}
          onComplete={() => stepDone('trace')}
        />
      )
    case 'choice':
      return (
        <LessonChoiceScreen
          key={`${vm.word.id}:choice`}
          {...common}
          options={vm.options}
          correctOptionId={vm.correctOptionId ?? ''}
          stepIndex={vm.stageIndex}
          stepTotal={vm.stageTotal}
          onAnswer={({ selectedId }) => { void answerChoice(selectedId) }}
          onContinue={next}
        />
      )
    case 'dictation':
      return (
        <LessonDictationScreen
          key={`${vm.word.id}:dictation`}
          {...common}
          questionIndex={vm.stageIndex}
          questionTotal={vm.stageTotal}
          allowForgot={false}
          onAnswer={({ value }) => { void answerDictation(value) }}
          onContinue={next}
          onCapturedContinue={next}
        />
      )
  }
}
