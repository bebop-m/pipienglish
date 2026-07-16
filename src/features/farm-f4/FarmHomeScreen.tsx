// F4 首页容器:只做 VM/事件桥接与阶段状态路由。
// 阶段 C 仅 daily_incomplete 进入正式 F4 视觉;其余两态在阶段 F 前仍保持内部开发壳。

import { useFarmHome } from './useFarmHome'
import { DevFarmView } from '../../dev/DevShell'
import { FarmStageShell } from './visual/FarmStageShell'
import { FarmHomeDaily } from './visual/FarmHomeDaily'

export function FarmHomeScreen() {
  const bridge = useFarmHome()
  const forceDevShell = import.meta.env.DEV && new URLSearchParams(window.location.search).has('dev-shell')
  return (
    <FarmStageShell>
      {!forceDevShell && bridge.vm?.state === 'daily_incomplete'
        ? <FarmHomeDaily vm={bridge.vm} dispatch={bridge.dispatch} />
        : <DevFarmView bridge={bridge} />}
    </FarmStageShell>
  )
}
