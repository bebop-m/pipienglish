import { describe, expect, it } from 'vitest'
import { documentHeightFor } from './viewportShortfall'

/** 2026-09-11 iPad A16 / iPadOS 26 桌面 App 的真机读数 */
const ipadA16Landscape = { standalone: true, innerWidth: 1180, innerHeight: 788, screenWidth: 820, screenHeight: 1180, safeAreaTop: 32 }

describe('documentHeightFor (iPadOS 26 standalone viewport shortfall)', () => {
  it('stretches the document to the real screen height when standalone is short by the status bar', () => {
    expect(documentHeightFor(ipadA16Landscape)).toBe(820)
  })

  it('does nothing when the viewport already fills the screen (older iPadOS, black-translucent)', () => {
    expect(documentHeightFor({ ...ipadA16Landscape, innerHeight: 820, safeAreaTop: 24 })).toBeNull()
  })

  it('does nothing under a default (opaque) status bar: the WebView really is shorter, stretching would overflow', () => {
    expect(documentHeightFor({ ...ipadA16Landscape, safeAreaTop: 0 })).toBeNull()
  })

  it('ignores Safari browser mode and gaps that do not match the status bar', () => {
    expect(documentHeightFor({ ...ipadA16Landscape, standalone: false })).toBeNull()
    expect(documentHeightFor({ ...ipadA16Landscape, innerHeight: 700 })).toBeNull() // 缺口 120 > 64
    expect(documentHeightFor({ ...ipadA16Landscape, innerHeight: 800, safeAreaTop: 32 })).toBeNull() // 缺口 20 ≠ 32
  })

  it('uses the larger screen edge in portrait', () => {
    expect(documentHeightFor({ standalone: true, innerWidth: 820, innerHeight: 1148, screenWidth: 820, screenHeight: 1180, safeAreaTop: 32 })).toBe(1180)
    expect(documentHeightFor({ standalone: true, innerWidth: 820, innerHeight: 1180, screenWidth: 820, screenHeight: 1180, safeAreaTop: 32 })).toBeNull()
  })
})
