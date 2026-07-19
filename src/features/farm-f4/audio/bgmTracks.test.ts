import { describe, expect, it } from 'vitest'
import { approvedBgmTrack, BGM_TRACKS, type BgmTrackDefinition } from './bgmTracks'

const draft: BgmTrackDefinition = {
  id: 'draft',
  assetFilename: 'draft.mp3',
  title: '未验收草稿',
  assetStatus: 'internal-placeholder',
}
const approved: BgmTrackDefinition = {
  id: 'approved',
  assetFilename: 'farm-loop.mp3',
  title: '晴空农场',
  assetStatus: 'approved',
}

describe('background music track gating', () => {
  it('keeps music invisible until a track passes visual approval', () => {
    expect(approvedBgmTrack([])).toBeNull()
    expect(approvedBgmTrack([draft])).toBeNull()
    expect(approvedBgmTrack([draft, approved])).toBe(approved)
  })

  it('ships no unapproved track in the production registry', () => {
    expect(BGM_TRACKS.every(track => track.assetStatus === 'approved')).toBe(true)
  })
})
