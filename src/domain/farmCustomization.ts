import {
  DEFAULT_CHARACTER_LOADOUT,
  type CharacterLoadout,
} from './farmCatalog'
import type {
  CharacterCosmeticSlot,
  CharacterTarget,
  CosmeticItemDefinition,
} from './farmCosmetics'
import type { PlacementBounds, SceneAssetStatus } from './farmScenes'
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
