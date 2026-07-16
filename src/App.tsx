// 入口:阶段 A 只挂 F4 首页容器(内为 DEV 开发壳)。
// 学习流/救援/家长页将按契约 §9 逐屏接入,导航层届时引入。

import { FarmHomeScreen } from './features/farm-f4/FarmHomeScreen'

export default function App() {
  return <FarmHomeScreen />
}
