import type { StagePoint } from './types'

export const MOVABLE_FARM_ELEMENT_IDS = ['mother', 'xiaopi', 'hatchery', 'rescue'] as const

export type MovableFarmElementId = (typeof MOVABLE_FARM_ELEMENT_IDS)[number]
export type SceneElementHomes = Partial<Record<MovableFarmElementId, StagePoint>>

interface SceneElementLayout {
  defaultHome: StagePoint
  size: { width: number; height: number }
  insets: { left: number; top: number; right: number; bottom: number }
}

const FARM_STAGE_SIZE = { width: 1194, height: 834 } as const

/**
 * 四类核心物件共享的 1194×834 舞台契约。默认位置、拖动边界和持久化恢复
 * 必须从同一份定义读取，避免损坏备份把关键入口恢复到屏幕外。
 */
export const SCENE_ELEMENT_LAYOUTS: Readonly<Record<MovableFarmElementId, SceneElementLayout>> = {
  mother: {
    defaultHome: { x: 615, y: 530 },
    size: { width: 220, height: 220 },
    insets: { left: 18, top: 300, right: 18, bottom: 10 },
  },
  xiaopi: {
    defaultHome: { x: 835, y: 495 },
    size: { width: 252, height: 274 },
    insets: { left: 18, top: 300, right: 18, bottom: 10 },
  },
  hatchery: {
    defaultHome: { x: 12, y: 544 },
    size: { width: 304, height: 286 },
    insets: { left: 12, top: 180, right: 12, bottom: 4 },
  },
  rescue: {
    defaultHome: { x: 1033, y: 252 },
    size: { width: 142, height: 154 },
    insets: { left: 12, top: 180, right: 12, bottom: 8 },
  },
}

export function clampSceneElementHome(
  elementId: MovableFarmElementId,
  home: StagePoint,
): StagePoint | null {
  if (!Number.isFinite(home.x) || !Number.isFinite(home.y)) return null
  const { size, insets } = SCENE_ELEMENT_LAYOUTS[elementId]
  return {
    x: Math.min(FARM_STAGE_SIZE.width - size.width - insets.right, Math.max(insets.left, home.x)),
    y: Math.min(FARM_STAGE_SIZE.height - size.height - insets.bottom, Math.max(insets.top, home.y)),
  }
}

export function sceneElementHomesKey(sceneId: string): string {
  return `scene-element-homes:${sceneId}`
}

export function normalizeSceneElementHomes(value: unknown): SceneElementHomes {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  return Object.fromEntries(MOVABLE_FARM_ELEMENT_IDS.flatMap(id => {
    const point = source[id]
    if (!point || typeof point !== 'object' || Array.isArray(point)) return []
    const { x, y } = point as Record<string, unknown>
    if (typeof x !== 'number' || typeof y !== 'number') return []
    const home = clampSceneElementHome(id, { x, y })
    return home ? [[id, home]] : []
  })) as SceneElementHomes
}
