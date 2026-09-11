// iPadOS 26 桌面 Web App 的视口缺口(2026-09-11 真机诊断:innerHeight 788、屏幕 820、safe-area-top 32):
// 系统把状态栏高度从布局视口里扣掉,却仍把 WebView 铺满整块屏并把内容画到状态栏下面,
// 于是屏幕底部空出一条只有画布底色的横带。`apple-mobile-web-app-status-bar-style` 在添加到主屏幕时
// 就被固化,改 meta 对已安装的 App 无效,只能在页面里把文档撑到真实屏幕高度让背景自己铺满。

export interface ViewportEnvironment {
  standalone: boolean
  innerWidth: number
  innerHeight: number
  screenWidth: number
  screenHeight: number
}

/** 只修补小于这个值的缺口:更大的差距是浏览器工具栏之类的正常情况,不是这个 bug */
export const MAX_VIEWPORT_SHORTFALL_PX = 64

/** 需要把文档撑到的高度;不需要修补时返回 null */
export function documentHeightFor(env: ViewportEnvironment): number | null {
  if (!env.standalone) return null
  // iPadOS 的 screen.width/height 按竖屏报数,横屏时真实高度是较小的那个
  const landscape = env.innerWidth >= env.innerHeight
  const screenHeight = landscape
    ? Math.min(env.screenWidth, env.screenHeight)
    : Math.max(env.screenWidth, env.screenHeight)
  const shortfall = screenHeight - env.innerHeight
  return shortfall > 0 && shortfall <= MAX_VIEWPORT_SHORTFALL_PX ? screenHeight : null
}

export const DOC_HEIGHT_VAR = '--f4-doc-height'

export function readViewportEnvironment(win: Window = window): ViewportEnvironment {
  const nav = win.navigator as Navigator & { standalone?: boolean }
  return {
    standalone: nav.standalone === true || win.matchMedia('(display-mode: standalone)').matches,
    innerWidth: win.innerWidth,
    innerHeight: win.innerHeight,
    screenWidth: win.screen.width,
    screenHeight: win.screen.height,
  }
}

/** 启动时安装:按当前视口写入/移除 --f4-doc-height,旋转与尺寸变化时重算;返回卸载函数 */
export function installDocumentHeightFix(win: Window = window): () => void {
  const root = win.document.documentElement
  const apply = () => {
    const height = documentHeightFor(readViewportEnvironment(win))
    if (height) root.style.setProperty(DOC_HEIGHT_VAR, `${height}px`)
    else root.style.removeProperty(DOC_HEIGHT_VAR)
  }
  apply()
  win.addEventListener('resize', apply)
  win.addEventListener('orientationchange', apply)
  win.visualViewport?.addEventListener('resize', apply)
  return () => {
    win.removeEventListener('resize', apply)
    win.removeEventListener('orientationchange', apply)
    win.visualViewport?.removeEventListener('resize', apply)
  }
}
