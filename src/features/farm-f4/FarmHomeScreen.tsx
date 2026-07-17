// F4 首页容器:只做 VM/事件桥接与阶段状态路由。
// 阶段 F 起，首页三种状态都进入正式 F4 视觉；开发壳仅显式查询参数可见。

import { useEffect } from 'react'
import { useFarmHome } from './useFarmHome'
import { DevFarmView } from '../../dev/DevShell'
import { FarmStageShell } from './visual/FarmStageShell'
import { FarmHomeDaily } from './visual/FarmHomeDaily'

export interface FarmHomeScreenProps {
  /** 路由层(App)消费导航意图;未接入的目标(手写游戏/救援/家长页)由 App 决定忽略或提示 */
  onNavigate?: (target: 'lesson' | 'handwriting' | 'rescue' | 'parent') => void
}

export function FarmHomeScreen({ onNavigate }: FarmHomeScreenProps = {}) {
  const bridge = useFarmHome()
  const forceDevShell = import.meta.env.DEV && new URLSearchParams(window.location.search).has('dev-shell')

  const { navigation, clearNavigation } = bridge
  useEffect(() => {
    if (navigation && onNavigate) {
      clearNavigation()
      onNavigate(navigation)
    }
  }, [navigation, clearNavigation, onNavigate])

  useEffect(() => {
    const testWindow = window as Window & { render_game_to_text?: () => string }
    testWindow.render_game_to_text = () => JSON.stringify({
      coordinateSystem: '1194x834 logical stage; origin top-left; x right; y down',
      screen: 'farm_home',
      state: bridge.vm?.state ?? 'loading',
      navigation: bridge.navigation,
      henName: bridge.vm?.henName ?? null,
      eggs: bridge.vm?.eggStock ?? 0,
      chicks: bridge.vm?.chicksTotal ?? 0,
      incubating: bridge.vm?.incubating.length ?? 0,
      rescue: bridge.vm?.rescueCount ?? 0,
      overlay: bridge.vm?.overlay ?? 'none',
    })
    return () => { delete testWindow.render_game_to_text }
  }, [bridge.navigation, bridge.vm])

  return (
    <FarmStageShell>
      {forceDevShell
        ? <DevFarmView bridge={bridge} />
        : bridge.vm
          ? <FarmHomeDaily vm={bridge.vm} dispatch={bridge.dispatch} />
          : null}
    </FarmStageShell>
  )
}
