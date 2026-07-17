// 写词游戏容器(SPEC §2.4 + 蛋经济 v2):每题复用小皮已批准的 H-5 默写卡,无任何视觉主张。
// 完成一轮 → 鸡蛋 +1(日上限 5,拿满后纯加练)→ 回农场;不限轮数,从木牌再进即新一轮。

import { useEffect } from 'react'
import { LessonDictationScreen } from '../lesson-f4/LessonDictationScreen'
import { useHandwriting } from './useHandwriting'

export interface HandwritingFlowScreenProps {
  onExit: () => void
}

export function HandwritingFlowScreen({ onExit }: HandwritingFlowScreenProps) {
  const { vm, answer, forgot, next } = useHandwriting()

  useEffect(() => {
    // 未解锁/无已学词直接回农场;一轮写完(煎蛋已发)也回农场
    if (vm?.hydrated && (vm.empty || vm.done)) onExit()
  }, [onExit, vm?.empty, vm?.done, vm?.hydrated])

  if (!vm || vm.empty || vm.done || !vm.word) return null

  return (
    <LessonDictationScreen
      key={`${vm.word.id}:${vm.index}`}
      word={vm.word}
      todayDone={vm.index - 1}
      todayTotal={vm.total}
      questionIndex={vm.index}
      questionTotal={vm.total}
      headerTitle={`写词游戏 · 第 ${vm.index} 题 / ${vm.total}`}
      progressText={vm.eggAvailable ? `写完 ${vm.total} 题得一颗鸡蛋` : '今天的奖励蛋拿满啦,这轮是加练'}
      stepChip="写一写 · 写词游戏"
      onBack={onExit}
      onAnswer={({ correct }) => {
        void answer(correct)
      }}
      onForgot={() => {
        void forgot()
      }}
      onContinue={next}
      onCapturedContinue={next}
    />
  )
}
