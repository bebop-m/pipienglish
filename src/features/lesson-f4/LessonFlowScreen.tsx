// 学习流容器:按当前步类型分发到 H-1~H-6 已批准生产组件,只做数据桥接与路由。
// 无任何视觉主张;所有画面均为小皮已确认的生产组件(F4_STAGE_H_VISUAL_APPROVAL.md)。

import { useLesson } from './useLesson'
import { LessonIntroScreen } from './LessonIntroScreen'
import { LessonTraceScreen } from './LessonTraceScreen'
import { LessonChoiceScreen } from './LessonChoiceScreen'
import { LessonListeningScreen } from './LessonListeningScreen'
import { LessonDictationScreen } from './LessonDictationScreen'
import { LessonFinishScreen } from './LessonFinishScreen'

export interface LessonFlowScreenProps {
  /** 回农场:头部返回按钮(断点已逐步落库)与结束页"回农场"共用 */
  onExit: () => void
}

export function LessonFlowScreen({ onExit }: LessonFlowScreenProps) {
  const { vm, finish, answer, forgot, stepDone, next } = useLesson()

  if (!vm) return null // 启动遮罩样式归视觉层;数据未就绪不渲染半成品

  if (vm.finished) {
    if (!finish) return null
    return (
      <LessonFinishScreen
        dayNumber={finish.dayNumber}
        summary={{
          newWords: finish.newWords,
          reviews: finish.reviews,
          streakDays: finish.streakDays,
          eggsEarned: finish.eggsEarned,
        }}
        onReturnFarm={onExit}
      />
    )
  }

  const step = vm.current
  if (!step) return null

  const common = {
    word: step.word,
    todayDone: vm.doneSteps,
    todayTotal: vm.totalSteps,
    onBack: onExit,
  }

  switch (step.type) {
    case 'intro':
      return (
        <LessonIntroScreen
          key={step.stepId}
          {...common}
          stepIndex={step.stepOrdinal}
          stepTotal={step.stepOrdinalTotal}
          onComplete={stepDone}
        />
      )
    case 'trace':
      return (
        <LessonTraceScreen
          key={step.stepId}
          {...common}
          stepIndex={step.stepOrdinal}
          stepTotal={step.stepOrdinalTotal}
          onComplete={() => stepDone()} // 笔迹不留档(F4-CHG-012)
        />
      )
    case 'choice':
      return (
        <LessonChoiceScreen
          key={step.stepId}
          {...common}
          options={step.options ?? []}
          correctOptionId={step.correctOptionId ?? ''}
          stepIndex={step.stepOrdinal}
          stepTotal={step.stepOrdinalTotal}
          onAnswer={({ correct }) => answer(correct)}
          onContinue={next}
        />
      )
    case 'listening':
      return (
        <LessonListeningScreen
          key={step.stepId}
          {...common}
          options={step.options ?? []}
          correctOptionId={step.correctOptionId ?? ''}
          questionIndex={step.stepOrdinal}
          questionTotal={step.stepOrdinalTotal}
          onAnswer={({ correct }) => answer(correct)}
          onContinue={next}
        />
      )
    case 'dictation':
    case 'closing':
      return (
        <LessonDictationScreen
          key={step.stepId}
          {...common}
          questionIndex={step.stepOrdinal}
          questionTotal={step.stepOrdinalTotal}
          onAnswer={({ correct }) => answer(correct)}
          onForgot={() => forgot()}
          onContinue={next}
          onCapturedContinue={next}
        />
      )
  }
}
