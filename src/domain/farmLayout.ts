import type { StagePoint } from './types'

export const MOVABLE_FARM_ELEMENT_IDS = ['mother', 'xiaopi', 'hatchery', 'rescue'] as const

export type MovableFarmElementId = (typeof MOVABLE_FARM_ELEMENT_IDS)[number]
export type SceneElementHomes = Partial<Record<MovableFarmElementId, StagePoint>>

interface SceneElementLayout {
  defaultHome: StagePoint
  size: { width: number; height: number }
  insets: { left: number; top: number; right: number; bottom: number }
}

export interface StageRect {
  left: number
  top: number
  right: number
  bottom: number
}

const FARM_STAGE_SIZE = { width: 1194, height: 834 } as const

/**
 * 每日任务卡片盖在所有可拖动物件之上（`.task-board-f3` / `.complete-board-f4` 是 z-index 65，
 * 孵化小屋 56、错题救援框 58、角色 20）。物件一旦落到卡片背后就再也点不到，
 * 等于永久丢失入口，和坐标飞出屏幕是同一类硬锁，因此落点必须避开这块 UI 保留区。
 * 数值取两张卡片实测外框的并集再留安全边，对应 `src/styles/f4/home.css` 的
 * `.task-board-f3`（28,92,370×247）与 `.complete-board-f4`（31,91,382×约 360，
 * F4-CHG-034 起多一行守护卡文案）。装饰物的落点保留区（farmCustomization）共用此矩形。
 */
export const DAILY_BOARD_KEEPOUT: StageRect = { left: 24, top: 88, right: 418, bottom: 460 }

/**
 * 右下角「布置农场 / 打开衣柜」按钮组(`.customization-entrances-f7`,z-index 64)同样压在装饰层之上,
 * 小装饰滑到右下角会被按钮盖住点不到;取按钮组实测外框(right 24 / bottom 22,约 200×40)再留安全边。
 */
export const CUSTOMIZATION_ENTRANCE_KEEPOUT: StageRect = { left: 956, top: 764, right: 1178, bottom: 820 }

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

function clampToSafeArea(elementId: MovableFarmElementId, home: StagePoint): StagePoint {
  const { size, insets } = SCENE_ELEMENT_LAYOUTS[elementId]
  return {
    x: Math.min(FARM_STAGE_SIZE.width - size.width - insets.right, Math.max(insets.left, home.x)),
    y: Math.min(FARM_STAGE_SIZE.height - size.height - insets.bottom, Math.max(insets.top, home.y)),
  }
}

function coversDailyBoard(elementId: MovableFarmElementId, home: StagePoint): boolean {
  const { size } = SCENE_ELEMENT_LAYOUTS[elementId]
  return home.x < DAILY_BOARD_KEEPOUT.right
    && home.x + size.width > DAILY_BOARD_KEEPOUT.left
    && home.y < DAILY_BOARD_KEEPOUT.bottom
    && home.y + size.height > DAILY_BOARD_KEEPOUT.top
}

export function clampSceneElementHome(
  elementId: MovableFarmElementId,
  home: StagePoint,
): StagePoint | null {
  if (!Number.isFinite(home.x) || !Number.isFinite(home.y)) return null
  return clampToSafeArea(elementId, home)
}

/**
 * 拖动过程跟手只钳安全区；真正落点、持久化和备份恢复走这里，额外推出任务卡片保留区。
 * 四个方向都出不去时回默认位置，保证任何一次写入都不会把物件永久藏到卡片背后。
 */
export function resolveSceneElementHome(
  elementId: MovableFarmElementId,
  home: StagePoint,
): StagePoint | null {
  const bounded = clampSceneElementHome(elementId, home)
  if (!bounded || !coversDailyBoard(elementId, bounded)) return bounded
  const { size, defaultHome } = SCENE_ELEMENT_LAYOUTS[elementId]
  const distance = (point: StagePoint) => (point.x - bounded.x) ** 2 + (point.y - bounded.y) ** 2
  const escapes = [
    { x: DAILY_BOARD_KEEPOUT.left - size.width, y: bounded.y },
    { x: DAILY_BOARD_KEEPOUT.right, y: bounded.y },
    { x: bounded.x, y: DAILY_BOARD_KEEPOUT.top - size.height },
    { x: bounded.x, y: DAILY_BOARD_KEEPOUT.bottom },
  ]
    .map(point => clampToSafeArea(elementId, point))
    .filter(point => !coversDailyBoard(elementId, point))
    .sort((a, b) => distance(a) - distance(b))
  return escapes[0] ?? clampToSafeArea(elementId, defaultHome)
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
    const home = resolveSceneElementHome(id, { x, y })
    return home ? [[id, home]] : []
  })) as SceneElementHomes
}
