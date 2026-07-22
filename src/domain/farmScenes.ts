import {
  APPROVED_COLOR_CHICK_VARIANT_ID,
  APPROVED_SPECIAL_CHICK_VARIANT_ID,
  DECORATION_EGG_PRICES,
  DEFAULT_NORMAL_CHICK_VARIANT_ID,
  SCENE_1_COLOR_CHICK_VARIANT_IDS,
  SCENE_1_SPECIAL_CHICK_VARIANT_IDS,
  type DecorationKind,
} from './farmCatalog'

export type SceneLayer = 'back' | 'actor' | 'front'
export type SceneAssetStatus = 'approved' | 'internal-placeholder'

export interface PlacementBounds {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

/** x/y 持久化的是 groundAnchor 在 1194×834 舞台中的逻辑坐标。 */
export interface DecorationRenderContract {
  canvasPx: { width: number; height: number }
  displayBoxPt: { width: number; height: number }
  groundAnchorPx: { x: number; y: number }
}

export interface DecorationCatalogItemDefinition {
  id: string
  sceneId: string
  assetId: string
  assetStatus: SceneAssetStatus
  kind: DecorationKind
  eggCost: 5 | 10 | 20
  releaseTier: 'core' | 'extension'
  layer: SceneLayer
  placementBounds: PlacementBounds
  render: DecorationRenderContract
}

export type HatcheryVisualState =
  | 'empty'
  | 'whole'
  | 'hairlineCrack'
  | 'largeCrack'
  | 'twoShells'
  | 'normalHatch'
  | 'colorHatch'
  | 'specialHatch'

export type HatcheryVisualStates = Readonly<Record<HatcheryVisualState, string>>

export interface StageRenderBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FixedSceneVisualDefinition {
  id: string
  assetId: string
  assetStatus: SceneAssetStatus
  alt: string
  renderBox: StageRenderBox
}

export interface SceneCharacterVisuals {
  motherAssetId: string
  xiaopiAssetId: string
  chickAssetIds: Readonly<Record<'normal' | 'color' | 'special', string>>
  specialChickAnchor: { footX: number; groundY: number }
}

export interface FarmSceneDefinition {
  id: string
  chapter: number
  title: string
  subtitle: string
  unlockAtTotalDays: number
  backgroundAssetId: string
  thumbnailAssetId: string
  assetStatus: SceneAssetStatus
  freeSignAssetId: string
  visibleChickCap: 40
  hatcheryVisualStates: HatcheryVisualStates
  hatcheryRenderBox: StageRenderBox
  characterVisuals: SceneCharacterVisuals
  fixedVisuals: readonly FixedSceneVisualDefinition[]
  decorationCatalog: readonly DecorationCatalogItemDefinition[]
  chickVariantIds: {
    normal: readonly string[]
    color: readonly string[]
    special: readonly string[]
  }
  cosmeticItemIds: readonly string[]
}

const SHARED_CHICK_ASSET_IDS = {
  normal: 'chick-f3.png',
  color: 'chicks/chick-color-approved-b.png',
  special: 'chicks/chick-special-approved-f.png',
} as const

const HATCHERY_RENDER_BOX = { x: 58, y: 643, width: 177, height: 177 } as const

function hatcheryVisualStates(sceneId: 'scene-1' | 'scene-2'): HatcheryVisualStates {
  const root = `scenes/${sceneId}/hatchery`
  return {
    empty: `${root}/01-empty.png`,
    whole: `${root}/02-whole.png`,
    hairlineCrack: `${root}/03-hairline-crack.png`,
    largeCrack: `${root}/04-large-crack.png`,
    twoShells: `${root}/05-two-shells.png`,
    normalHatch: `${root}/06-normal-hatch.png`,
    colorHatch: `${root}/07-color-hatch.png`,
    specialHatch: `${root}/08-special-hatch.png`,
  }
}

const DECORATION_RENDER_BY_KIND = {
  small: {
    canvasPx: { width: 1254, height: 1254 },
    displayBoxPt: { width: 104, height: 82 },
    groundAnchorPx: { x: 631, y: 928 },
  },
  medium: {
    canvasPx: { width: 1254, height: 1254 },
    displayBoxPt: { width: 205, height: 138 },
    groundAnchorPx: { x: 629, y: 980 },
  },
  landmark: {
    canvasPx: { width: 1254, height: 1254 },
    displayBoxPt: { width: 330, height: 300 },
    groundAnchorPx: { x: 636, y: 1145 },
  },
} as const satisfies Readonly<Record<DecorationKind, DecorationRenderContract>>

const PLACEMENT_BOUNDS_BY_KIND = {
  small: { xMin: 40, xMax: 1154, yMin: 560, yMax: 810 },
  medium: { xMin: 120, xMax: 1074, yMin: 500, yMax: 800 },
  landmark: { xMin: 240, xMax: 954, yMin: 390, yMax: 700 },
} as const satisfies Readonly<Record<DecorationKind, PlacementBounds>>

function decoration(
  sceneId: string,
  suffix: string,
  kind: DecorationKind,
  layer: SceneLayer,
  releaseTier: 'core' | 'extension',
): DecorationCatalogItemDefinition {
  return {
    id: `${sceneId}-${suffix}`,
    sceneId,
    assetId: `internal-placeholder:${sceneId}-${suffix}`,
    assetStatus: 'internal-placeholder',
    kind,
    eggCost: DECORATION_EGG_PRICES[kind],
    releaseTier,
    layer,
    placementBounds: { ...PLACEMENT_BOUNDS_BY_KIND[kind] },
    render: {
      canvasPx: { ...DECORATION_RENDER_BY_KIND[kind].canvasPx },
      displayBoxPt: { ...DECORATION_RENDER_BY_KIND[kind].displayBoxPt },
      groundAnchorPx: { ...DECORATION_RENDER_BY_KIND[kind].groundAnchorPx },
    },
  }
}

const SCENE_1_DECORATIONS: readonly DecorationCatalogItemDefinition[] = [
  decoration('scene-1', 'flower-sign', 'small', 'front', 'core'),
  decoration('scene-1', 'picnic-crate', 'medium', 'actor', 'core'),
  decoration('scene-1', 'welcome-landmark', 'landmark', 'back', 'core'),
  decoration('scene-1', 'flower-pot', 'small', 'front', 'extension'),
  decoration('scene-1', 'butterfly-post', 'small', 'front', 'extension'),
  decoration('scene-1', 'berry-basket', 'small', 'front', 'extension'),
  decoration('scene-1', 'garden-bench', 'medium', 'actor', 'extension'),
  decoration('scene-1', 'watering-cart', 'medium', 'actor', 'extension'),
  decoration('scene-1', 'old-oak-landmark', 'landmark', 'back', 'extension'),
]

/**
 * 当前可发布离线内容包。发布边界只包含场景 1；内部贴纸定义不会自动出现在儿童目录。
 * availableChapter 的生产值必须只从本数组推导。
 */
export const FARM_SCENE_DEFINITIONS: readonly FarmSceneDefinition[] = [
  {
    id: 'scene-1',
    chapter: 1,
    title: '晴空农场',
    subtitle: '小鸡们最初相遇的地方',
    unlockAtTotalDays: 0,
    backgroundAssetId: 'farm-background-f3.png',
    thumbnailAssetId: 'farm-background-f3.png',
    assetStatus: 'approved',
    freeSignAssetId: 'internal-placeholder:scene-1-travel-sign',
    visibleChickCap: 40,
    hatcheryVisualStates: hatcheryVisualStates('scene-1'),
    hatcheryRenderBox: HATCHERY_RENDER_BOX,
    characterVisuals: {
      motherAssetId: 'mother-f3.png',
      xiaopiAssetId: 'xiaopi-f3.png',
      chickAssetIds: SHARED_CHICK_ASSET_IDS,
      specialChickAnchor: { footX: 1080, groundY: 778 },
    },
    fixedVisuals: [],
    decorationCatalog: SCENE_1_DECORATIONS,
    chickVariantIds: {
      normal: [DEFAULT_NORMAL_CHICK_VARIANT_ID],
      color: SCENE_1_COLOR_CHICK_VARIANT_IDS,
      special: SCENE_1_SPECIAL_CHICK_VARIANT_IDS,
    },
    cosmeticItemIds: [
      'xiaopi-accessory-scene-1-core',
      'xiaopi-hair-scene-1-extension',
      'xiaopi-hat-look-scene-1-extension',
      'xiaopi-outfit-scene-1-extension',
      'mother-headwear-scene-1-extension',
      'mother-neckwear-scene-1-extension',
    ],
  },
]

const SCENE_2_COLOR_CHICK_VARIANT_IDS = [APPROVED_COLOR_CHICK_VARIANT_ID] as const
const SCENE_2_SPECIAL_CHICK_VARIANT_IDS = [APPROVED_SPECIAL_CHICK_VARIANT_ID] as const

/** 未来草案定义，不属于当前可发布包，生产查找和 availableChapter 均不会读取。 */
export const FUTURE_FARM_SCENE_DRAFTS: readonly FarmSceneDefinition[] = [
  {
    id: 'scene-2',
    chapter: 2,
    title: '苹果园',
    subtitle: '苹果树洞旁的新旅程',
    unlockAtTotalDays: 36,
    backgroundAssetId: 'scenes/scene-2/orchard-background.png',
    thumbnailAssetId: 'scenes/scene-2/orchard-background.png',
    assetStatus: 'internal-placeholder',
    freeSignAssetId: 'internal-placeholder:scene-2-travel-sign',
    visibleChickCap: 40,
    hatcheryVisualStates: hatcheryVisualStates('scene-2'),
    hatcheryRenderBox: HATCHERY_RENDER_BOX,
    characterVisuals: {
      motherAssetId: 'scenes/scene-2/mother.png',
      xiaopiAssetId: 'scenes/scene-2/xiaopi.png',
      chickAssetIds: SHARED_CHICK_ASSET_IDS,
      specialChickAnchor: { footX: 1094, groundY: 778 },
    },
    fixedVisuals: [
      {
        id: 'scene-2-apple-juice-station',
        assetId: 'scenes/scene-2/apple-juice-station.png',
        assetStatus: 'approved',
        alt: '苹果汁驿站',
        renderBox: { x: 249, y: 579, width: 336, height: 234 },
      },
    ],
    decorationCatalog: [
      decoration('scene-2', 'flower-basket', 'small', 'front', 'core'),
      decoration('scene-2', 'field-bench', 'medium', 'actor', 'core'),
      decoration('scene-2', 'windmill-landmark', 'landmark', 'back', 'core'),
    ],
    chickVariantIds: {
      normal: [DEFAULT_NORMAL_CHICK_VARIANT_ID],
      color: SCENE_2_COLOR_CHICK_VARIANT_IDS,
      special: SCENE_2_SPECIAL_CHICK_VARIANT_IDS,
    },
    cosmeticItemIds: ['mother-headwear-scene-2-core'],
  },
]

export function sceneById(
  sceneId: string,
  definitions: readonly FarmSceneDefinition[] = FARM_SCENE_DEFINITIONS,
): FarmSceneDefinition | null {
  return definitions.find(scene => scene.id === sceneId) ?? null
}

export function sceneByChapter(
  chapter: number,
  definitions: readonly FarmSceneDefinition[] = FARM_SCENE_DEFINITIONS,
): FarmSceneDefinition | null {
  return definitions.find(scene => scene.chapter === chapter) ?? null
}
