// F4 首页容器:只做 VM/事件桥接与阶段状态路由。
// 阶段 F 起，首页三种状态都进入正式 F4 视觉；开发壳仅显式查询参数可见。

import { useFarmHome } from './useFarmHome'
import { DevFarmView } from '../../dev/DevShell'
import { FarmStageShell } from './visual/FarmStageShell'
import { FarmHomeDaily } from './visual/FarmHomeDaily'

export function FarmHomeScreen() {
  const bridge = useFarmHome()
  const forceDevShell = import.meta.env.DEV && new URLSearchParams(window.location.search).has('dev-shell')
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
