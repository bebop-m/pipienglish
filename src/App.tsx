// 生产路由:农场首页 ↔ 学习流(阶段 H 整流:H-1~H-6 均已获小皮批准,导航正式开放)。
// 救援与写词游戏按爸爸裁决直接复用生产学习卡并开放；家长页继续门控。

import { useState } from 'react'
import { FarmHomeScreen } from './features/farm-f4/FarmHomeScreen'
import { LessonFlowScreen } from './features/lesson-f4/LessonFlowScreen'
import { LessonChoiceScreen } from './features/lesson-f4/LessonChoiceScreen'
import { LessonDictationScreen } from './features/lesson-f4/LessonDictationScreen'
import { LessonFinishScreen } from './features/lesson-f4/LessonFinishScreen'
import { LessonIntroScreen } from './features/lesson-f4/LessonIntroScreen'
import { LessonListeningScreen } from './features/lesson-f4/LessonListeningScreen'
import { LessonTraceScreen } from './features/lesson-f4/LessonTraceScreen'
import { RescueFlowScreen } from './features/rescue-f4/RescueFlowScreen'
import { HandwritingFlowScreen } from './features/handwriting-f4/HandwritingFlowScreen'

const INTRO_PREVIEWS = {
  egg: { id: 'egg', word: 'egg', ipa: '/eɡ/', meaning: '鸡蛋', sentence: 'The hen laid an egg!', sentenceCn: '母鸡下了一颗蛋！', imageAssetId: 'egg-f4-v2' },
  because: { id: 'because', word: 'because', ipa: '/bɪˈkɒz/', meaning: '因为', sentence: 'I stayed inside because it rained.', sentenceCn: '因为下雨了，所以我待在屋里。' },
} as const

const EGG_MEANING_OPTIONS = [
  { id: 'egg', label: '鸡蛋' },
  { id: 'hen', label: '母鸡' },
  { id: 'apple', label: '苹果' },
  { id: 'bread', label: '面包' },
]

export default function App() {
  const [route, setRoute] = useState<'farm' | 'lesson' | 'rescue' | 'handwriting'>('farm')

  const previewParams = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null
  const preview = previewParams?.get('lesson-intro')
  if (preview === 'egg' || preview === 'because') {
    return <LessonIntroScreen word={INTRO_PREVIEWS[preview]} todayDone={3} todayTotal={18} onBack={() => undefined} onComplete={() => undefined} />
  }
  if (previewParams?.get('lesson-trace') === 'egg') {
    return <LessonTraceScreen word={INTRO_PREVIEWS.egg} todayDone={4} todayTotal={18} onBack={() => undefined} onComplete={() => undefined} />
  }
  if (previewParams?.get('lesson-choice') === 'egg') {
    return (
      <LessonChoiceScreen
        word={INTRO_PREVIEWS.egg}
        options={EGG_MEANING_OPTIONS}
        correctOptionId="egg"
        todayDone={5}
        todayTotal={18}
        onBack={() => undefined}
        onAnswer={() => undefined}
        onContinue={() => undefined}
      />
    )
  }
  if (previewParams?.get('lesson-listening') === 'egg') {
    return (
      <LessonListeningScreen
        word={INTRO_PREVIEWS.egg}
        options={EGG_MEANING_OPTIONS}
        correctOptionId="egg"
        todayDone={6}
        todayTotal={18}
        onBack={() => undefined}
        onAnswer={() => undefined}
        onContinue={() => undefined}
      />
    )
  }
  if (previewParams?.get('lesson-dictation') === 'egg') {
    const previewState = previewParams.get('state')
    const initialState = previewState === 'correct' || previewState === 'retry' || previewState === 'captured'
      ? previewState
      : 'ready'
    return (
      <LessonDictationScreen
        word={INTRO_PREVIEWS.egg}
        todayDone={7}
        todayTotal={18}
        initialState={initialState}
        onBack={() => undefined}
        onAnswer={() => undefined}
        onForgot={() => undefined}
        onContinue={() => undefined}
        onCapturedContinue={() => undefined}
      />
    )
  }
  if (previewParams?.get('lesson-finish') === '1') {
    return <LessonFinishScreen dayNumber={7} summary={{ newWords: 4, reviews: 6, streakDays: 3, eggsEarned: 1 }} onReturnFarm={() => undefined} />
  }

  if (route === 'lesson') {
    return <LessonFlowScreen onExit={() => setRoute('farm')} />
  }
  if (route === 'rescue') {
    return <RescueFlowScreen onExit={() => setRoute('farm')} />
  }
  if (route === 'handwriting') {
    return <HandwritingFlowScreen onExit={() => setRoute('farm')} />
  }
  return (
    <FarmHomeScreen
      onNavigate={target => {
        if (target === 'lesson') setRoute('lesson')
        if (target === 'rescue') setRoute('rescue')
        if (target === 'handwriting') setRoute('handwriting')
        // parent:继续门控
      }}
    />
  )
}
