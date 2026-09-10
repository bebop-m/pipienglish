import {
  DEFAULT_CHARACTER_LOADOUT,
  type CharacterLoadout,
} from './farmCatalog'
import type {
  CharacterCosmeticSlot,
  CharacterTarget,
  CosmeticItemDefinition,
} from './farmCosmetics'
import { CUSTOMIZATION_ENTRANCE_KEEPOUT, DAILY_BOARD_KEEPOUT, type StageRect } from './farmLayout'
import type { DecorationCatalogItemDefinition, PlacementBounds, SceneAssetStatus } from './farmScenes'
import type { StagePoint } from './types'

export function assetIsListable(status: SceneAssetStatus, includeInternalPlaceholders = false): boolean {
  return status === 'approved' || includeInternalPlaceholders
}

/** 拖拽落点钳制:把地面锚点收回允许范围,保证提交给 placeDecoration 的坐标必然合法 */
export function clampPointToPlacementBounds(point: StagePoint, bounds: PlacementBounds): StagePoint {
  return {
    x: Math.min(bounds.xMax, Math.max(bounds.xMin, point.x)),
    y: Math.min(bounds.yMax, Math.max(bounds.yMin, point.y)),
  }
}

export function pointWithinPlacementBounds(point: StagePoint, bounds: PlacementBounds): boolean {
  return Number.isFinite(point.x)
    && Number.isFinite(point.y)
    && point.x >= bounds.xMin
    && point.x <= bounds.xMax
    && point.y >= bounds.yMin
    && point.y <= bounds.yMax
}

type DecorationGeometry = Pick<DecorationCatalogItemDefinition, 'render' | 'placementBounds'>

/**
 * 装饰物落点保留区:每日任务/完成/回访卡片与右下角按钮组都压在装饰层之上,
 * 贴纸一旦整张落到它们背后就再也点不到(2026-09-10 真机复现:风车拖到卡片后消失)。
 * 与 F4-CHG-031 对四类核心物件的处理同构,只是矩形按贴纸自己的显示框计算。
 */
export const DECORATION_KEEPOUTS: readonly StageRect[] = [DAILY_BOARD_KEEPOUT, CUSTOMIZATION_ENTRANCE_KEEPOUT]

/** 贴纸画布在 1194×834 舞台上的显示矩形;与视觉层 decorationRenderLayout 同一换算 */
export function decorationDisplayRect(definition: Pick<DecorationCatalogItemDefinition, 'render'>, home: StagePoint): StageRect {
  const { canvasPx, displayBoxPt, groundAnchorPx } = definition.render
  const left = home.x - groundAnchorPx.x / canvasPx.width * displayBoxPt.width
  const top = home.y - groundAnchorPx.y / canvasPx.height * displayBoxPt.height
  return { left, top, right: left + displayBoxPt.width, bottom: top + displayBoxPt.height }
}

function rectsOverlap(a: StageRect, b: StageRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function overlapArea(a: StageRect, b: StageRect): number {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return width > 0 && height > 0 ? width * height : 0
}

const rectArea = (rect: StageRect) => (rect.right - rect.left) * (rect.bottom - rect.top)

export function decorationCoversKeepout(definition: Pick<DecorationCatalogItemDefinition, 'render'>, home: StagePoint): boolean {
  const rect = decorationDisplayRect(definition, home)
  return DECORATION_KEEPOUTS.some(keepout => rectsOverlap(rect, keepout))
}

/**
 * 落点解析:先钳回 placementBounds,再把压在保留区上的贴纸沿最近方向推出去;
 * 四个方向都出不去时回到范围中心。松手、placeDecoration 与读取旧存档共用,
 * 保证任何一次写入或显示都不会把贴纸永久藏到 UI 背后。
 */
export function resolveDecorationHome(definition: DecorationGeometry, point: StagePoint): StagePoint {
  const bounded = clampPointToPlacementBounds(point, definition.placementBounds)
  const rect = decorationDisplayRect(definition, bounded)
  const blocking = DECORATION_KEEPOUTS.filter(keepout => rectsOverlap(rect, keepout))
  if (blocking.length === 0) return { x: Math.round(bounded.x), y: Math.round(bounded.y) }

  const width = rect.right - rect.left
  const height = rect.bottom - rect.top
  const anchorDx = bounded.x - rect.left
  const anchorDy = bounded.y - rect.top
  const margin = 2 // 推出后留 2pt 缝,四舍五入到整数坐标也不会重新贴上保留区
  const distance = (candidate: StagePoint) => (candidate.x - bounded.x) ** 2 + (candidate.y - bounded.y) ** 2
  const settle = (candidate: StagePoint): StagePoint => {
    const clamped = clampPointToPlacementBounds(candidate, definition.placementBounds)
    return { x: Math.round(clamped.x), y: Math.round(clamped.y) }
  }
  const escapes = blocking
    .flatMap(keepout => [
      { x: keepout.left - width + anchorDx - margin, y: bounded.y },
      { x: keepout.right + anchorDx + margin, y: bounded.y },
      { x: bounded.x, y: keepout.top - height + anchorDy - margin },
      { x: bounded.x, y: keepout.bottom + anchorDy + margin },
    ])
    .map(settle)
    .filter(candidate => !decorationCoversKeepout(definition, candidate))
    .sort((a, b) => distance(a) - distance(b))
  return escapes[0] ?? settle({
    x: (definition.placementBounds.xMin + definition.placementBounds.xMax) / 2,
    y: (definition.placementBounds.yMin + definition.placementBounds.yMax) / 2,
  })
}

/**
 * 「摆出来」的初始落点:从范围中心向两侧、上下逐圈找一个不和已摆放贴纸叠在一起的位置,
 * 否则同类贴纸会全部叠在同一点,只有最上面一件能拖(2026-09-10 真机复现)。
 */
export function initialDecorationHome(
  definition: DecorationGeometry,
  occupied: ReadonlyArray<{ definition: Pick<DecorationCatalogItemDefinition, 'render'>; home: StagePoint }>,
): StagePoint {
  const bounds = definition.placementBounds
  const center = { x: (bounds.xMin + bounds.xMax) / 2, y: (bounds.yMin + bounds.yMax) / 2 }
  const box = definition.render.displayBoxPt
  const taken = occupied.map(item => decorationDisplayRect(item.definition, item.home))
  const crowded = (home: StagePoint) => {
    const rect = decorationDisplayRect(definition, home)
    return taken.some(other => overlapArea(rect, other) > 0.35 * Math.min(rectArea(rect), rectArea(other)))
  }
  const candidates: StagePoint[] = [center]
  for (let ring = 1; ring <= 6; ring += 1) {
    for (const dy of [0, -0.5, 0.5]) {
      for (const sign of [1, -1]) {
        candidates.push({ x: center.x + sign * ring * box.width * 0.6, y: center.y + dy * box.height })
      }
    }
  }
  for (const candidate of candidates) {
    const home = resolveDecorationHome(definition, candidate)
    if (!crowded(home)) return home
  }
  return resolveDecorationHome(definition, center)
}

export function loadoutItem(
  loadout: CharacterLoadout,
  target: CharacterTarget,
  slot: CharacterCosmeticSlot,
): string | null | undefined {
  if (target === 'xiaopi') {
    if (slot !== 'headLook' && slot !== 'outfit' && slot !== 'accessory') return undefined
    return loadout.xiaopi[slot]
  }
  if (slot !== 'headwear' && slot !== 'neckwear') return undefined
  return loadout.mother[slot]
}

export type EquipLoadoutResult =
  | { ok: true; loadout: CharacterLoadout }
  | { ok: false; reason: 'target-mismatch' | 'slot-mismatch' }

/** 只改变装备态；所有权校验由应用事务在调用本函数前完成。 */
export function equipLoadoutItem(
  loadout: CharacterLoadout,
  definition: CosmeticItemDefinition,
  target: CharacterTarget,
  slot: CharacterCosmeticSlot,
): EquipLoadoutResult {
  if (definition.target !== target) return { ok: false, reason: 'target-mismatch' }
  if (definition.slot !== slot || loadoutItem(loadout, target, slot) === undefined) {
    return { ok: false, reason: 'slot-mismatch' }
  }
  if (target === 'xiaopi') {
    const xiaopi = { ...loadout.xiaopi, [slot]: definition.id }
    return { ok: true, loadout: { xiaopi, mother: { ...loadout.mother } } }
  }
  const mother = { ...loadout.mother, [slot]: definition.id }
  return { ok: true, loadout: { xiaopi: { ...loadout.xiaopi }, mother } }
}

export function unequipLoadoutItem(
  loadout: CharacterLoadout,
  target: CharacterTarget,
  slot: CharacterCosmeticSlot,
): EquipLoadoutResult {
  if (loadoutItem(loadout, target, slot) === undefined) return { ok: false, reason: 'slot-mismatch' }
  if (target === 'xiaopi') {
    const fallback = slot === 'headLook'
      ? DEFAULT_CHARACTER_LOADOUT.xiaopi.headLook
      : slot === 'outfit'
        ? DEFAULT_CHARACTER_LOADOUT.xiaopi.outfit
        : null
    const xiaopi = { ...loadout.xiaopi, [slot]: fallback }
    return { ok: true, loadout: { xiaopi, mother: { ...loadout.mother } } }
  }
  const mother = { ...loadout.mother, [slot]: null }
  return { ok: true, loadout: { xiaopi: { ...loadout.xiaopi }, mother } }
}
