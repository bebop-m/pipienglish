import { describe, expect, it } from 'vitest'
import {
  APPROVED_STANDARD_CHARACTER_LAYERS,
  CHARACTER_ANCHORS,
  stableCharacterLayers,
  type CharacterLayerAssetDefinition,
} from './characterLayerContract'

describe('character layer contract', () => {
  it('keeps the measured Stage B anchors stable without referencing candidate files', () => {
    expect(CHARACTER_ANCHORS.xiaopi).toEqual({
      canvasPx: { width: 1254, height: 1254 },
      footAnchorPx: { x: 627, y: 1104 },
      displayBoxPt: { width: 252, height: 274 },
    })
    expect(CHARACTER_ANCHORS.mother.footAnchorPx).toEqual({ x: 622, y: 1058 })
    const approved = Object.values(APPROVED_STANDARD_CHARACTER_LAYERS).flat()
    expect(approved.map(layer => layer.assetId).sort()).toEqual(['mother-f3.png', 'xiaopi-f3.png'])
    expect(approved.every(layer => layer.assetStatus === 'approved')).toBe(true)
  })

  it('sorts matching layers and rejects a layer with a drifting anchor', () => {
    const base: CharacterLayerAssetDefinition = {
      logicalId: 'internal-placeholder:body',
      assetId: 'internal-placeholder:body',
      assetStatus: 'internal-placeholder',
      target: 'xiaopi',
      role: 'body',
      order: 20,
      anchor: CHARACTER_ANCHORS.xiaopi,
    }
    const front = { ...base, logicalId: 'internal-placeholder:front', role: 'front' as const, order: 30 }
    const drifting = {
      ...base,
      logicalId: 'internal-placeholder:drift',
      order: 10,
      anchor: { ...CHARACTER_ANCHORS.xiaopi, footAnchorPx: { x: 628, y: 1104 } },
    }
    expect(stableCharacterLayers('xiaopi', [front, drifting, base]).map(layer => layer.logicalId))
      .toEqual([base.logicalId, front.logicalId])
  })
})
