import { useEffect, useState } from 'react'
import { shouldShowInstallHint } from './installPrompt'

const DISMISS_KEY = 'pipi:install-hint-dismissed:v1'

export function InstallHint() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean }
    const displayMode = window.matchMedia('(display-mode: standalone)')
    const forceVisible = import.meta.env.DEV && new URLSearchParams(window.location.search).has('install-hint')
    let dismissed = false
    try {
      dismissed = window.localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      // Safari 隐私模式下 localStorage 可能不可用；提示本身仍可正常显示和关闭。
    }

    setVisible(forceVisible || (!dismissed && shouldShowInstallHint({
      userAgent: nav.userAgent,
      platform: nav.platform,
      maxTouchPoints: nav.maxTouchPoints,
      navigatorStandalone: nav.standalone === true,
      displayModeStandalone: displayMode.matches,
    })))
  }, [])

  if (!visible) return null

  const dismiss = () => {
    setVisible(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // 关闭动作不依赖持久化成功。
    }
  }

  return (
    <aside className="install-hint-f4" aria-label="添加到 iPad 主屏幕">
      <span className="install-share-f4" aria-hidden="true"><span>↑</span></span>
      <span><strong>把小鸡农场放到主屏幕</strong><small>点 Safari 的“分享”，再选“添加到主屏幕”。</small></span>
      <button type="button" onClick={dismiss} aria-label="关闭安装提示">知道了</button>
    </aside>
  )
}
