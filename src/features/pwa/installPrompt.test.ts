import { describe, expect, it } from 'vitest'
import { isIpadLike, isMobileSafari, shouldShowInstallHint, type InstallEnvironment } from './installPrompt'

const IPAD_SAFARI: InstallEnvironment = {
  userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1',
  platform: 'iPad',
  maxTouchPoints: 5,
  navigatorStandalone: false,
  displayModeStandalone: false,
}

describe('PWA 安装提示判定', () => {
  it('识别传统 iPad 与使用桌面 UA 的 iPadOS', () => {
    expect(isIpadLike(IPAD_SAFARI)).toBe(true)
    expect(isIpadLike({ ...IPAD_SAFARI, userAgent: 'Mozilla/5.0 (Macintosh) Version/18.5 Safari/605.1.15', platform: 'MacIntel' })).toBe(true)
  })

  it('只把 Safari 识别为可显示 iOS 安装指引的浏览器', () => {
    expect(isMobileSafari(IPAD_SAFARI)).toBe(true)
    expect(isMobileSafari({ userAgent: IPAD_SAFARI.userAgent.replace('Version/18.5', 'CriOS/138.0') })).toBe(false)
  })

  it('已从主屏幕启动时不再提示', () => {
    expect(shouldShowInstallHint(IPAD_SAFARI)).toBe(true)
    expect(shouldShowInstallHint({ ...IPAD_SAFARI, navigatorStandalone: true })).toBe(false)
    expect(shouldShowInstallHint({ ...IPAD_SAFARI, displayModeStandalone: true })).toBe(false)
  })

  it('桌面浏览器不显示 iPad 专用提示', () => {
    expect(shouldShowInstallHint({ ...IPAD_SAFARI, userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/138 Safari/537.36', platform: 'Win32', maxTouchPoints: 0 })).toBe(false)
  })
})
