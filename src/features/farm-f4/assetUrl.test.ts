import { describe, expect, it } from 'vitest'
import { f4AssetUrl, publicAssetUrl } from './assetUrl'

describe('publicAssetUrl', () => {
  it('keeps local root deployments at the origin root', () => {
    expect(publicAssetUrl('/assets/f4/egg.png', '/')).toBe('/assets/f4/egg.png')
  })

  it('prefixes assets with the GitHub Pages project path and serves the WebP derivative', () => {
    expect(f4AssetUrl('egg.png', '/pipienglish/')).toBe('/pipienglish/assets/f4/egg.webp')
    expect(f4AssetUrl('scenes/scene-2/decorations/apple-crate.png', '/')).toBe('/assets/f4/scenes/scene-2/decorations/apple-crate.webp')
    expect(f4AssetUrl('audio/bgm-english-garden.mp3', '/')).toBe('/assets/f4/audio/bgm-english-garden.mp3')
  })

  it('normalizes a base path without a trailing slash', () => {
    expect(publicAssetUrl('assets/f4/egg.png', '/pipienglish')).toBe('/pipienglish/assets/f4/egg.png')
  })
})
