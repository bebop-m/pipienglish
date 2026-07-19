// F4 首页容器:只做 VM/事件桥接与阶段状态路由。
// 阶段 F 起，首页三种状态都进入正式 F4 视觉；开发壳仅显式查询参数可见。

import { useEffect } from 'react'
import { useFarmHome } from './useFarmHome'
import { DevFarmView } from '../../dev/DevShell'
import { FarmStageShell } from './visual/FarmStageShell'
import { FarmHomeDaily } from './visual/FarmHomeDaily'
import { f4AssetUrl } from './assetUrl'

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
      scene: bridge.vm?.activeSceneId ?? null,
      viewedScene: bridge.vm?.viewedSceneId ?? null,
      isViewingCurrentJourney: bridge.vm?.isViewingCurrentJourney ?? true,
      pendingCelebrationChapter: bridge.vm?.pendingCelebrationScene?.chapter ?? null,
      nextTravelChapter: bridge.vm?.nextTravelScene?.chapter ?? null,
      favorites: bridge.vm?.favoriteCount ?? 0,
      chicksInCoop: bridge.vm?.chicksInCoop ?? 0,
      arrivingChickId: bridge.vm?.arrivingChick?.chickId ?? null,
      incubating: bridge.vm?.incubating ? 1 : 0,
      cookingMeal: bridge.vm?.cookingMeal ?? null,
      listedDecorations: bridge.vm?.decorationCatalog.length ?? 0,
      placedDecorations: bridge.vm?.placedDecorations.length ?? 0,
      listedCosmetics: bridge.vm?.wardrobeCatalog.length ?? 0,
      loadout: bridge.vm?.loadout ?? null,
      rescue: bridge.vm?.rescueCount ?? 0,
      overlay: bridge.vm?.overlay ?? 'none',
    })
    return () => { delete testWindow.render_game_to_text }
  }, [bridge.navigation, bridge.vm])

  return (
    <FarmStageShell
      backgroundAssetUrl={bridge.vm ? f4AssetUrl(bridge.vm.viewedScene.backgroundAssetId) : undefined}
      ariaLabel={bridge.vm ? `${bridge.vm.viewedScene.title} · 皮皮のEnglish` : undefined}
    >
      {forceDevShell
        ? <DevFarmView bridge={bridge} />
        : bridge.vm
          ? <FarmHomeDaily vm={bridge.vm} dispatch={bridge.dispatch} />
          : null}
    </FarmStageShell>
  )
}
