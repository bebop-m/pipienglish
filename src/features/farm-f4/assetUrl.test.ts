import { describe, expect, it } from 'vitest'
import { f4AssetUrl, publicAssetUrl } from './assetUrl'

describe('publicAssetUrl', () => {
  it('keeps local root deployments at the origin root', () => {
    expect(publicAssetUrl('/assets/f4/egg.png', '/')).toBe('/assets/f4/egg.png')
  })

  it('prefixes assets with the GitHub Pages project path', () => {
    expect(f4AssetUrl('egg.png', '/pipienglish/')).toBe('/pipienglish/assets/f4/egg.png')
  })

  it('normalizes a base path without a trailing slash', () => {
    expect(publicAssetUrl('assets/f4/egg.png', '/pipienglish')).toBe('/pipienglish/assets/f4/egg.png')
  })
})
