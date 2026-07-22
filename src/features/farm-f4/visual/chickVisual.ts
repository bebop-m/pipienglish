import type { FarmChickVM, FarmSceneVM } from '../../../application/viewmodel'
import type { StagePoint } from '../../../domain/types'

export const STANDARD_CHICK_CANVAS_PT = 116
export const SPECIAL_CHICK_CANVAS_PT = 141

const SPECIAL_ALPHA_BBOX = { left: 336, top: 437, right: 905, bottom: 983 } as const
const NORMALIZED_CANVAS_PX = 1254

/** rarity 决定批准资产；variantId 保留为业务身份，旧存档也只回退到同 rarity 的冻结图。 */
export function chickAssetId(
  chick: Pick<FarmChickVM, 'rarity' | 'variantId'>,
  scene: Pick<FarmSceneVM, 'characterVisuals'>,
): string {
  return scene.characterVisuals.chickAssetIds[chick.rarity]
}

export function chickCanvasSize(chick: Pick<FarmChickVM, 'rarity'>): number {
  return chick.rarity === 'special' ? SPECIAL_CHICK_CANVAS_PT : STANDARD_CHICK_CANVAS_PT
}

/** 把 G3 批准的可见轮廓 foot/ground anchor 换算为 1254 统一画布左上角。 */
export function specialChickHome(
  anchor: FarmSceneVM['characterVisuals']['specialChickAnchor'],
): StagePoint {
  const scale = SPECIAL_CHICK_CANVAS_PT / NORMALIZED_CANVAS_PX
  const visibleCenterX = (SPECIAL_ALPHA_BBOX.left + SPECIAL_ALPHA_BBOX.right) / 2
  return {
    x: Math.round(anchor.footX - visibleCenterX * scale),
    y: Math.round(anchor.groundY - SPECIAL_ALPHA_BBOX.bottom * scale),
  }
}
