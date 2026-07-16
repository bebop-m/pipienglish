// F4 首页容器:只做 VM/事件桥接,不含任何视觉主张。
// 阶段 B:固定舞台外壳已接入;阶段 C 再以真实 F4 首页视觉替换内部 DevFarmView。

import { useFarmHome } from './useFarmHome'
import { DevFarmView } from '../../dev/DevShell'
import { FarmStageShell } from './visual/FarmStageShell'

export function FarmHomeScreen() {
  const bridge = useFarmHome()
  // DEV PLACEHOLDER:内部开发壳,永不面向小皮(契约 §5;V-8 裁决)
  return (
    <FarmStageShell>
      <DevFarmView bridge={bridge} />
    </FarmStageShell>
  )
}
