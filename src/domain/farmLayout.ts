import type { StagePoint } from './types'

export const MOVABLE_FARM_ELEMENT_IDS = ['mother', 'xiaopi', 'hatchery', 'rescue'] as const

export type MovableFarmElementId = (typeof MOVABLE_FARM_ELEMENT_IDS)[number]
export type SceneElementHomes = Partial<Record<MovableFarmElementId, StagePoint>>

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
    return typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y)
      ? [[id, { x, y }]]
      : []
  })) as SceneElementHomes
}
