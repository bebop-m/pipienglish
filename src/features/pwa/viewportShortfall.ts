// iPadOS 26 桌面 Web App 的视口缺口(2026-09-11 真机诊断:innerHeight 788、屏幕 820、safe-area-top 32):
// 在 black-translucent 状态栏下,系统把状态栏高度从布局视口里扣掉,却仍把 WebView 铺满整块屏并把内容画到
// 状态栏下面,于是屏幕底部空出一条只有画布底色的横带。`apple-mobile-web-app-status-bar-style` 在添加到主屏幕时
// 就被固化,改 meta 对已安装的 App 无效,只能在页面里把文档撑到真实屏幕高度让背景自己铺满。

export interface ViewportEnvironment {
  standalone: boolean
  innerWidth: number
  innerHeight: number
  screenWidth: number
  screenHeight: number
  /** env(safe-area-inset-top):内容延伸到状态栏下面时等于状态栏高度;default 状态栏下为 0 */
  safeAreaTop: number
}

/** 只修补小于这个值的缺口:更大的差距是浏览器工具栏之类的正常情况,不是这个 bug */
export const MAX_VIEWPORT_SHORTFALL_PX = 64

/**
 * 需要把文档撑到的高度;不需要修补时返回 null。
 * 缺口必须约等于状态栏高度:default 状态栏(safe-area-top = 0)下 WebView 本来就排在状态栏下方、
 * 只有 788 高,再撑高就会溢出;旧 iPadOS 的 black-translucent 没有缺口,也不动。
 */
export function documentHeightFor(env: ViewportEnvironment): number | null {
  if (!env.standalone) return null
  // iPadOS 的 screen.width/height 按竖屏报数,横屏时真实高度是较小的那个
  const landscape = env.innerWidth >= env.innerHeight
  const screenHeight = landscape
    ? Math.min(env.screenWidth, env.screenHeight)
    : Math.max(env.screenWidth, env.screenHeight)
  const shortfall = screenHeight - env.innerHeight
  if (shortfall <= 0 || shortfall > MAX_VIEWPORT_SHORTFALL_PX) return null
  if (env.safeAreaTop <= 0 || Math.abs(shortfall - env.safeAreaTop) > 4) return null
  return screenHeight
}

export const DOC_HEIGHT_VAR = '--f4-doc-height'
const PROBE_ID = 'f4-safe-area-probe'

/** 读 env(safe-area-inset-top):用一个不可见探针元素的 padding 取值(JS 无法直接读 env()) */
function safeAreaTopOf(win: Window): number {
  const doc = win.document
  let probe = doc.getElementById(PROBE_ID)
  if (!probe) {
    probe = doc.createElement('div')
    probe.id = PROBE_ID
    probe.setAttribute('aria-hidden', 'true')
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);'
    doc.body.appendChild(probe)
  }
  return parseFloat(win.getComputedStyle(probe).paddingTop) || 0
}

export function readViewportEnvironment(win: Window = window): ViewportEnvironment {
  const nav = win.navigator as Navigator & { standalone?: boolean }
  return {
    standalone: nav.standalone === true || win.matchMedia('(display-mode: standalone)').matches,
    innerWidth: win.innerWidth,
    innerHeight: win.innerHeight,
    screenWidth: win.screen.width,
    screenHeight: win.screen.height,
    safeAreaTop: safeAreaTopOf(win),
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
