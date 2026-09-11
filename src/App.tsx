// 生产路由:农场首页 ↔ 学习流(阶段 H 整流:H-1~H-6 均已获小皮批准,导航正式开放)。
// 救援与写词游戏按爸爸裁决直接复用生产学习卡并开放；
// 家长页 2026-08-05 爸爸裁决开放(F4-CHG-032)，入口内置算术门控防小皮误入。
// F4-CHG-035:首页之外的屏幕按路由懒加载,主包只装农场;分包由 Service Worker 一并预缓存,离线仍可进。

import { lazy, Suspense, useState } from 'react'
import { FarmHomeScreen } from './features/farm-f4/FarmHomeScreen'

const LessonFlowScreen = lazy(() => import('./features/lesson-f4/LessonFlowScreen').then(m => ({ default: m.LessonFlowScreen })))
const RescueFlowScreen = lazy(() => import('./features/rescue-f4/RescueFlowScreen').then(m => ({ default: m.RescueFlowScreen })))
const HandwritingFlowScreen = lazy(() => import('./features/handwriting-f4/HandwritingFlowScreen').then(m => ({ default: m.HandwritingFlowScreen })))
const ParentScreen = lazy(() => import('./features/parent/ParentScreen').then(m => ({ default: m.ParentScreen })))
const DevPreviewRoutes = import.meta.env.DEV ? lazy(() => import('./dev/DevPreviewRoutes')) : null

const PREVIEW_PARAMS = ['lesson-intro', 'lesson-trace', 'lesson-choice', 'lesson-listening', 'lesson-dictation', 'lesson-finish']

export default function App() {
  const [route, setRoute] = useState<'farm' | 'lesson' | 'rescue' | 'handwriting' | 'parent'>('farm')

  if (DevPreviewRoutes) {
    const params = new URLSearchParams(window.location.search)
    if (PREVIEW_PARAMS.some(key => params.has(key))) {
      return <Suspense fallback={null}><DevPreviewRoutes params={params} /></Suspense>
    }
  }

  if (route === 'lesson') {
    return <Suspense fallback={null}><LessonFlowScreen onExit={() => setRoute('farm')} /></Suspense>
  }
  if (route === 'rescue') {
    return <Suspense fallback={null}><RescueFlowScreen onExit={() => setRoute('farm')} /></Suspense>
  }
  if (route === 'handwriting') {
    return <Suspense fallback={null}><HandwritingFlowScreen onExit={() => setRoute('farm')} /></Suspense>
  }
  if (route === 'parent') {
    return <Suspense fallback={null}><ParentScreen onExit={() => setRoute('farm')} /></Suspense>
  }
  return (
    <FarmHomeScreen
      onNavigate={target => {
        if (target === 'lesson') setRoute('lesson')
        if (target === 'rescue') setRoute('rescue')
        if (target === 'handwriting') setRoute('handwriting')
        if (target === 'parent') setRoute('parent')
      }}
    />
  )
}
