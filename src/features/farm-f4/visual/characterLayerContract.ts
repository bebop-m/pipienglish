import type { CharacterLoadout } from '../../../domain/farmCatalog'
import type { CharacterTarget } from '../../../domain/farmCosmetics'
import type { SceneAssetStatus } from '../../../domain/farmScenes'
import type { StagePoint } from '../../../domain/types'

export type CharacterSurface = 'farm-home' | 'wardrobe'
export type CharacterLayerRole =
  | 'approved-standard'
  | 'back'
  | 'body'
  | 'outfit'
  | 'neckwear'
  | 'front'
  | 'headLook'
  | 'headwear'
  | 'accessory'

export interface CharacterAnchorContract {
  canvasPx: { width: 1254; height: 1254 }
  footAnchorPx: StagePoint
  displayBoxPt: { width: number; height: number }
}

export interface CharacterLayerAssetDefinition {
  logicalId: string
  assetId: string
  assetStatus: SceneAssetStatus
  target: CharacterTarget
  role: CharacterLayerRole
  order: number
  anchor: CharacterAnchorContract
}

export interface LayeredCharacterGroupVM {
  target: CharacterTarget
  surface: CharacterSurface
  loadout: CharacterLoadout['xiaopi'] | CharacterLoadout['mother']
  home: StagePoint
  /** 已按 order 排好；移动、镜像和缩放只能施加到整个 group。 */
  layers: readonly CharacterLayerAssetDefinition[]
}

export const CHARACTER_ANCHORS = {
  xiaopi: {
    canvasPx: { width: 1254, height: 1254 },
    footAnchorPx: { x: 627, y: 1104 },
    displayBoxPt: { width: 252, height: 274 },
  },
  mother: {
    canvasPx: { width: 1254, height: 1254 },
    footAnchorPx: { x: 622, y: 1058 },
    displayBoxPt: { width: 220, height: 220 },
  },
} as const satisfies Readonly<Record<CharacterTarget, CharacterAnchorContract>>

/**
 * 当前唯一可发布角色资产：已批准压平标准造型。阶段 A back/body/front 候选不在此清单，
 * 框架 8 阶段 B 可在批准后用相同 anchor 增加分层条目，而无需改变 loadout 或存档 ID。
 */
export const APPROVED_STANDARD_CHARACTER_LAYERS = {
  xiaopi: [{
    logicalId: 'xiaopi-approved-standard-f4',
    assetId: 'xiaopi-f3.png',
    assetStatus: 'approved',
    target: 'xiaopi',
    role: 'approved-standard',
    order: 0,
    anchor: CHARACTER_ANCHORS.xiaopi,
  }],
  mother: [{
    logicalId: 'mother-approved-standard-f4',
    assetId: 'mother-f3.png',
    assetStatus: 'approved',
    target: 'mother',
    role: 'approved-standard',
    order: 0,
    anchor: CHARACTER_ANCHORS.mother,
  }],
} as const satisfies Readonly<Record<CharacterTarget, readonly CharacterLayerAssetDefinition[]>>

export function stableCharacterLayers(
  target: CharacterTarget,
  layers: readonly CharacterLayerAssetDefinition[],
): CharacterLayerAssetDefinition[] {
  const anchor = CHARACTER_ANCHORS[target]
  return layers
    .filter(layer => layer.target === target)
    .filter(layer => (
      layer.anchor.canvasPx.width === anchor.canvasPx.width
      && layer.anchor.canvasPx.height === anchor.canvasPx.height
      && layer.anchor.footAnchorPx.x === anchor.footAnchorPx.x
      && layer.anchor.footAnchorPx.y === anchor.footAnchorPx.y
      && layer.anchor.displayBoxPt.width === anchor.displayBoxPt.width
      && layer.anchor.displayBoxPt.height === anchor.displayBoxPt.height
    ))
    .slice()
    .sort((left, right) => left.order - right.order)
}
