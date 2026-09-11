// 开发期单屏预览(?lesson-intro=egg 之类);只在 DEV 且带查询参数时由 App 懒加载,
// 生产主包不再包含这些直接引用(F4-CHG-035 主包拆分)。

import { LessonChoiceScreen } from '../features/lesson-f4/LessonChoiceScreen'
import { LessonDictationScreen } from '../features/lesson-f4/LessonDictationScreen'
import { LessonFinishScreen } from '../features/lesson-f4/LessonFinishScreen'
import { LessonIntroScreen } from '../features/lesson-f4/LessonIntroScreen'
import { LessonListeningScreen } from '../features/lesson-f4/LessonListeningScreen'
import { LessonTraceScreen } from '../features/lesson-f4/LessonTraceScreen'

const INTRO_PREVIEWS = {
  egg: { id: 'egg', word: 'egg', ipa: '/eɡ/', meaning: '鸡蛋', sentence: 'The hen laid an egg!', sentenceCn: '母鸡下了一颗蛋！', imageAssetId: 'egg-f4-v2' },
  because: { id: 'because', word: 'because', ipa: '/bɪˈkɒz/', meaning: '因为', sentence: 'I stayed inside because it rained.', sentenceCn: '因为下雨了，所以我待在屋里。' },
  // 词库最长词(11 字母),用于校验描红底字与排版的溢出边界
  supermarket: { id: 'supermarket', word: 'supermarket', ipa: '/ˈsuːpərmɑːrkɪt/', meaning: '超市', sentence: 'We buy meat at the supermarket.', sentenceCn: '我们在超市买肉。' },
} as const

type IntroPreviewKey = keyof typeof INTRO_PREVIEWS

function introPreviewKey(value: string | null | undefined): IntroPreviewKey | null {
  return value && value in INTRO_PREVIEWS ? value as IntroPreviewKey : null
}

const EGG_MEANING_OPTIONS = [
  { id: 'egg', label: '鸡蛋' },
  { id: 'hen', label: '母鸡' },
  { id: 'apple', label: '苹果' },
  { id: 'bread', label: '面包' },
]

export const PREVIEW_PARAMS = ['lesson-intro', 'lesson-trace', 'lesson-choice', 'lesson-listening', 'lesson-dictation', 'lesson-finish'] as const

export function hasPreviewParam(params: URLSearchParams): boolean {
  return PREVIEW_PARAMS.some(key => params.has(key))
}

export default function DevPreviewRoutes({ params }: { params: URLSearchParams }) {
  const preview = introPreviewKey(params.get('lesson-intro'))
  if (preview) {
    return <LessonIntroScreen word={INTRO_PREVIEWS[preview]} todayDone={3} todayTotal={18} onBack={() => undefined} onComplete={() => undefined} />
  }
  const tracePreview = introPreviewKey(params.get('lesson-trace'))
  if (tracePreview) {
    return <LessonTraceScreen word={INTRO_PREVIEWS[tracePreview]} todayDone={4} todayTotal={18} onBack={() => undefined} onComplete={() => undefined} />
  }
  if (params.get('lesson-choice') === 'egg') {
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
  if (params.get('lesson-listening') === 'egg') {
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
  if (params.get('lesson-dictation') === 'egg') {
    const previewState = params.get('state')
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
  if (params.get('lesson-finish') === '1') {
    return <LessonFinishScreen dayNumber={7} summary={{ newWords: 4, reviews: 6, streakDays: 3, eggsEarned: 1 }} onReturnFarm={() => undefined} />
  }
  return null
}
