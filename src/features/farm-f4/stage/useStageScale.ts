// 舞台缩放 Hook:测量容器(容器的安全区内边距由 Codex 的 CSS 负责),输出变换参数

import { useEffect, useState, type RefObject } from 'react'
import { computeStageTransform, MIN_COMFORT_SCALE, type StageTransform } from './stagePoint'

export interface StageScaleState extends StageTransform {
  belowComfort: boolean // true 时视觉层显示"请全屏打开小鸡农场"(FIDELITY §2)
  ready: boolean // false 期间可隐藏舞台,防先错位后跳回(FIDELITY §7)
}

export function useStageScale(containerRef: RefObject<HTMLElement | null>): StageScaleState {
  const [state, setState] = useState<StageScaleState>({
    scale: 1, left: 0, top: 0, belowComfort: false, ready: false,
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      const t = computeStageTransform(rect.width, rect.height)
      setState({ ...t, belowComfort: t.scale < MIN_COMFORT_SCALE, ready: true })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('orientationchange', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', measure)
    }
  }, [containerRef])

  return state
}
