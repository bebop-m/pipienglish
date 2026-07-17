// 生产入口仍只挂 F4 首页；阶段 H 的已批准页面先通过 DEV 查询参数回归。
// 待学习流各屏批准后，再一次性接入孩子可见导航，避免暴露半成品流程。

import { FarmHomeScreen } from './features/farm-f4/FarmHomeScreen'
import { LessonIntroScreen } from './features/lesson-f4/LessonIntroScreen'
import { LessonTraceScreen } from './features/lesson-f4/LessonTraceScreen'

const INTRO_PREVIEWS = {
  egg: { id: 'egg', word: 'egg', ipa: '/eɡ/', meaning: '鸡蛋', sentence: 'The hen laid an egg!', sentenceCn: '母鸡下了一颗蛋！', imageAssetId: 'egg-f4-v2' },
  because: { id: 'because', word: 'because', ipa: '/bɪˈkɒz/', meaning: '因为', sentence: 'I stayed inside because it rained.', sentenceCn: '因为下雨了，所以我待在屋里。' },
} as const

export default function App() {
  const previewParams = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null
  const preview = previewParams?.get('lesson-intro')
  if (preview === 'egg' || preview === 'because') {
    return <LessonIntroScreen word={INTRO_PREVIEWS[preview]} todayDone={3} todayTotal={18} onBack={() => undefined} onComplete={() => undefined} />
  }
  if (previewParams?.get('lesson-trace') === 'egg') {
    return <LessonTraceScreen word={INTRO_PREVIEWS.egg} todayDone={4} todayTotal={18} onBack={() => undefined} onComplete={() => undefined} />
  }
  return <FarmHomeScreen />
}
