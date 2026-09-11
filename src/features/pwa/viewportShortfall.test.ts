import { describe, expect, it } from 'vitest'
import { documentHeightFor } from './viewportShortfall'

const ipadA16Landscape = { standalone: true, innerWidth: 1180, innerHeight: 788, screenWidth: 820, screenHeight: 1180 }

describe('documentHeightFor (iPadOS 26 standalone viewport shortfall)', () => {
  it('stretches the document to the real screen height when standalone is 32pt short', () => {
    expect(documentHeightFor(ipadA16Landscape)).toBe(820)
  })

  it('does nothing when the viewport already fills the screen', () => {
    expect(documentHeightFor({ ...ipadA16Landscape, innerHeight: 820 })).toBeNull()
  })

  it('ignores Safari browser mode (toolbars are not this bug)', () => {
    expect(documentHeightFor({ ...ipadA16Landscape, standalone: false })).toBeNull()
    expect(documentHeightFor({ ...ipadA16Landscape, innerHeight: 700 })).toBeNull() // 缺口 120 > 64
  })

  it('uses the larger screen edge in portrait', () => {
    expect(documentHeightFor({ standalone: true, innerWidth: 820, innerHeight: 1148, screenWidth: 820, screenHeight: 1180 })).toBe(1180)
    expect(documentHeightFor({ standalone: true, innerWidth: 820, innerHeight: 1180, screenWidth: 820, screenHeight: 1180 })).toBeNull()
  })
})
