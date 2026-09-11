import type { StageRenderBox } from './farmScenes'
import type { StagePoint } from './types'

export const MOVABLE_FARM_ELEMENT_IDS = ['mother', 'xiaopi', 'hatchery', 'rescue'] as const

export type MovableFarmElementId = (typeof MOVABLE_FARM_ELEMENT_IDS)[number]
/** 按场景保存的落点:四类核心物件用固定 id,场景固定装置(路牌、驿站等)用 fixedVisuals 的 id */
export type SceneElementHomes = { [elementId: string]: StagePoint | undefined }

export interface SceneElementLayout {
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
 * 全首页可拖(爸爸 2026-09-11):物件只需整体留在舞台内、不钻到顶部工具栏(z 80,高约 66pt)后面。
 * 原先母鸡/小皮限制在 y ≥ 300、鸡窝/救援框 y ≥ 180、小鸡 y ≥ 300,拖动范围只剩下半屏。
 */
export const STAGE_DRAG_INSETS = { left: 8, top: 80, right: 8, bottom: 4 } as const

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
 * 右下角「布置农场 / 打开衣柜」按钮组(`.customization-entrances-f7`,z-index 64)同样压在物件之上;
 * 取按钮组实测外框(right 24 / bottom 22,约 200×40)。上沿 770 恰好不碰小皮默认落点(495+274=769)。
 */
export const CUSTOMIZATION_ENTRANCE_KEEPOUT: StageRect = { left: 956, top: 770, right: 1178, bottom: 820 }

export const SCENE_ELEMENT_KEEPOUTS: readonly StageRect[] = [DAILY_BOARD_KEEPOUT, CUSTOMIZATION_ENTRANCE_KEEPOUT]

/**
 * 四类核心物件共享的 1194×834 舞台契约。默认位置、拖动边界和持久化恢复
 * 必须从同一份定义读取，避免损坏备份把关键入口恢复到屏幕外。
 */
export const SCENE_ELEMENT_LAYOUTS: Readonly<Record<MovableFarmElementId, SceneElementLayout>> = {
  mother: {
    defaultHome: { x: 615, y: 530 },
    size: { width: 220, height: 220 },
    insets: STAGE_DRAG_INSETS,
  },
  xiaopi: {
    defaultHome: { x: 835, y: 495 },
    size: { width: 252, height: 274 },
    insets: STAGE_DRAG_INSETS,
  },
  hatchery: {
    defaultHome: { x: 12, y: 544 },
    size: { width: 304, height: 286 },
    insets: STAGE_DRAG_INSETS,
  },
  rescue: {
    defaultHome: { x: 1033, y: 252 },
    size: { width: 142, height: 154 },
    insets: STAGE_DRAG_INSETS,
  },
}

/** 场景固定装置(苹果汁驿站、路牌…)也可拖动:布局直接来自场景定义的 renderBox */
export function fixedVisualLayout(renderBox: StageRenderBox): SceneElementLayout {
  return {
    defaultHome: { x: renderBox.x, y: renderBox.y },
    size: { width: renderBox.width, height: renderBox.height },
    insets: STAGE_DRAG_INSETS,
  }
}

function clampToSafeArea(layout: SceneElementLayout, home: StagePoint): StagePoint {
  const { size, insets } = layout
  return {
    x: Math.min(FARM_STAGE_SIZE.width - size.width - insets.right, Math.max(insets.left, home.x)),
    y: Math.min(FARM_STAGE_SIZE.height - size.height - insets.bottom, Math.max(insets.top, home.y)),
  }
}

function rectOf(size: SceneElementLayout['size'], home: StagePoint): StageRect {
  return { left: home.x, top: home.y, right: home.x + size.width, bottom: home.y + size.height }
}

function rectsOverlap(a: StageRect, b: StageRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

/** 小鸡等按尺寸自由拖动的物件:整体留在舞台内、不进顶部工具栏 */
export function clampBoxToStage(size: SceneElementLayout['size'], home: StagePoint): StagePoint {
  return clampToSafeArea({ defaultHome: home, size, insets: STAGE_DRAG_INSETS }, home)
}

export function boxAvoidsKeepouts(size: SceneElementLayout['size'], home: StagePoint): boolean {
  const rect = rectOf(size, home)
  return !SCENE_ELEMENT_KEEPOUTS.some(keepout => rectsOverlap(rect, keepout))
}

export function clampElementHome(layout: SceneElementLayout, home: StagePoint): StagePoint | null {
  if (!Number.isFinite(home.x) || !Number.isFinite(home.y)) return null
  return clampToSafeArea(layout, home)
}

/**
 * 拖动过程跟手只钳安全区；真正落点、持久化和备份恢复走这里，额外推出任务卡片与右下按钮组保留区。
 * 四个方向都出不去时回默认位置，保证任何一次写入都不会把物件永久藏到 UI 背后。
 */
export function resolveElementHome(layout: SceneElementLayout, home: StagePoint): StagePoint | null {
  const bounded = clampElementHome(layout, home)
  if (!bounded) return null
  const { size } = layout
  const settle = (point: StagePoint) => {
    const clamped = clampToSafeArea(layout, point)
    return { x: Math.round(clamped.x), y: Math.round(clamped.y) }
  }
  const start = settle(bounded)
  const blocking = SCENE_ELEMENT_KEEPOUTS.filter(keepout => rectsOverlap(rectOf(size, start), keepout))
  if (blocking.length === 0) return start
  const distance = (point: StagePoint) => (point.x - start.x) ** 2 + (point.y - start.y) ** 2
  const escapes = blocking
    .flatMap(keepout => [
      { x: keepout.left - size.width, y: start.y },
      { x: keepout.right, y: start.y },
      { x: start.x, y: keepout.top - size.height },
      { x: start.x, y: keepout.bottom },
    ])
    .map(settle)
    .filter(point => boxAvoidsKeepouts(size, point))
    .sort((a, b) => distance(a) - distance(b))
  return escapes[0] ?? settle(layout.defaultHome)
}

export function clampSceneElementHome(elementId: MovableFarmElementId, home: StagePoint): StagePoint | null {
  return clampElementHome(SCENE_ELEMENT_LAYOUTS[elementId], home)
}

export function resolveSceneElementHome(elementId: MovableFarmElementId, home: StagePoint): StagePoint | null {
  return resolveElementHome(SCENE_ELEMENT_LAYOUTS[elementId], home)
}

export function sceneElementHomesKey(sceneId: string): string {
  return `scene-element-homes:${sceneId}`
}

/**
 * 读取持久化落点:四类核心物件按固定契约,场景固定装置按传入的布局表;
 * 不认识的 id、损坏坐标一律丢弃,压在保留区上的旧落点就地推出。
 */
export function normalizeSceneElementHomes(
  value: unknown,
  extraLayouts: Readonly<Record<string, SceneElementLayout>> = {},
): SceneElementHomes {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const layouts: Record<string, SceneElementLayout> = { ...extraLayouts, ...SCENE_ELEMENT_LAYOUTS }
  return Object.fromEntries(Object.entries(layouts).flatMap(([id, layout]) => {
    const point = source[id]
    if (!point || typeof point !== 'object' || Array.isArray(point)) return []
    const { x, y } = point as Record<string, unknown>
    if (typeof x !== 'number' || typeof y !== 'number') return []
    const home = resolveElementHome(layout, { x, y })
    return home ? [[id, home]] : []
  })) as SceneElementHomes
}
