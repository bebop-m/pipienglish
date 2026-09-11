import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { installDocumentHeightFix } from './features/pwa/viewportShortfall'
import './styles.css'

// 先于首帧:iPadOS 26 桌面 App 的布局视口比屏幕矮 32pt,把文档撑到真实高度让背景铺满底部
installDocumentHeightFix()
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
