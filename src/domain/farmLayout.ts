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
 * 首页左上角四种卡片(z-index 65)在 1194×834 舞台上的实测外框 + 4pt 边(2026-09-11 浏览器量取):
 * 任务卡 `.task-board-f3`、完成卡 `.complete-board-f4`、起名卡 `.name-board-f4`、回访卡 `.return-journey-board-f4`。
 * 落点只按当前真正显示的那张算,不再用并集——否则任务卡下面一大片会变成空气墙(小皮 2026-09-11 反馈)。
 */
export type HomeBoardKind = 'task' | 'complete' | 'name' | 'return'
export const HOME_BOARD_RECTS: Readonly<Record<HomeBoardKind, StageRect>> = {
  task: { left: 24, top: 88, right: 402, bottom: 343 },
  complete: { left: 26, top: 86, right: 418, bottom: 457 },
  name: { left: 26, top: 99, right: 441, bottom: 380 },
  return: { left: 26, top: 100, right: 424, bottom: 336 },
}

/** 历史并集矩形:没有首页状态可依据时(旧测试/纯领域调用)的保守默认 */
export const DAILY_BOARD_KEEPOUT: StageRect = { left: 24, top: 86, right: 441, bottom: 457 }

/**
 * 右下角「布置农场 / 打开衣柜」按钮组(`.customization-entrances-f7`,z-index 64)同样压在物件之上;
 * 实测外框 974,771–1170,812 再留 4pt 边。
 */
export const CUSTOMIZATION_ENTRANCE_KEEPOUT: StageRect = { left: 970, top: 767, right: 1174, bottom: 816 }

export const SCENE_ELEMENT_KEEPOUTS: readonly StageRect[] = [DAILY_BOARD_KEEPOUT, CUSTOMIZATION_ENTRANCE_KEEPOUT]

export function boardKindFor(input: { henName: string | null; completed: boolean; viewingCurrentJourney: boolean }): HomeBoardKind {
  if (!input.viewingCurrentJourney) return 'return'
  if (input.henName === null) return 'name'
  return input.completed ? 'complete' : 'task'
}

/** 当前首页真正压在物件之上的 UI 矩形:左上角那张卡片 + 右下角按钮组 */
export function uiKeepoutsFor(board: HomeBoardKind): StageRect[] {
  return [HOME_BOARD_RECTS[board], CUSTOMIZATION_ENTRANCE_KEEPOUT]
}

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

export function rectOf(size: SceneElementLayout['size'], home: StagePoint): StageRect {
  return { left: home.x, top: home.y, right: home.x + size.width, bottom: home.y + size.height }
}

export function rectsOverlap(a: StageRect, b: StageRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

export function overlapArea(a: StageRect, b: StageRect): number {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return width > 0 && height > 0 ? width * height : 0
}

export const rectArea = (rect: StageRect) => (rect.right - rect.left) * (rect.bottom - rect.top)

/**
 * 「露出来的部分够不够手指抓」:至少 35% 面积、且不少于 44×44pt 没被 UI 盖住,就允许停在那儿。
 * 这是软规则:贴纸可以靠着卡片、伸到卡片下面,只有整张(或几乎整张)藏起来才算被挡。
 */
export const MIN_VISIBLE_RATIO = 0.35
export const MIN_VISIBLE_AREA = 44 * 44

export function blockedByKeepouts(rect: StageRect, keepouts: readonly StageRect[]): boolean {
  const area = rectArea(rect)
  if (area <= 0) return false
  // 两块保留区互不相交,直接相加即可
  const covered = keepouts.reduce((sum, keepout) => sum + overlapArea(rect, keepout), 0)
  const visible = area - covered
  return visible < Math.max(area * MIN_VISIBLE_RATIO, Math.min(MIN_VISIBLE_AREA, area))
}

/** 小鸡等按尺寸自由拖动的物件:整体留在舞台内、不进顶部工具栏 */
export function clampBoxToStage(size: SceneElementLayout['size'], home: StagePoint): StagePoint {
  return clampToSafeArea({ defaultHome: home, size, insets: STAGE_DRAG_INSETS }, home)
}

/** 散步目标用的硬规则:完全不碰 UI 保留区(走到卡片背后会暂时看不见) */
export function boxAvoidsKeepouts(
  size: SceneElementLayout['size'],
  home: StagePoint,
  keepouts: readonly StageRect[] = SCENE_ELEMENT_KEEPOUTS,
): boolean {
  const rect = rectOf(size, home)
  return !keepouts.some(keepout => rectsOverlap(rect, keepout))
}

/**
 * 从 start 出发,按 8pt 步长向右/下/左/上试探,找到第一个「露出来的部分够抓」且经 clamp 后仍成立的点。
 * 没被挡就原样返回;四个方向在 maxShift 内都找不到返回 null。
 */
export function settleOutsideKeepouts(
  start: StagePoint,
  rectAt: (point: StagePoint) => StageRect,
  clamp: (point: StagePoint) => StagePoint,
  keepouts: readonly StageRect[],
  maxShift: number,
): StagePoint | null {
  const settled = clamp(start)
  if (!blockedByKeepouts(rectAt(settled), keepouts)) return settled
  const directions = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }]
  for (let shift = 8; shift <= maxShift; shift += 8) {
    for (const direction of directions) {
      const candidate = clamp({ x: settled.x + direction.x * shift, y: settled.y + direction.y * shift })
      if (!blockedByKeepouts(rectAt(candidate), keepouts)) return candidate
    }
  }
  return null
}

export function clampElementHome(layout: SceneElementLayout, home: StagePoint): StagePoint | null {
  if (!Number.isFinite(home.x) || !Number.isFinite(home.y)) return null
  return clampToSafeArea(layout, home)
}

/**
 * 拖动过程跟手只钳安全区；真正落点、持久化和备份恢复走这里,被 UI 盖住太多时就近挪到露得出来的位置。
 * 四个方向都挪不出去时回默认位置，保证任何一次写入都不会把物件永久藏到 UI 背后。
 */
export function resolveElementHome(
  layout: SceneElementLayout,
  home: StagePoint,
  keepouts: readonly StageRect[] = SCENE_ELEMENT_KEEPOUTS,
): StagePoint | null {
  const bounded = clampElementHome(layout, home)
  if (!bounded) return null
  const { size } = layout
  const settle = (point: StagePoint) => {
    const clamped = clampToSafeArea(layout, point)
    return { x: Math.round(clamped.x), y: Math.round(clamped.y) }
  }
  // 元素比卡片小时,要挪出卡片得移动超过自身尺寸:上限直接给整个舞台宽度(≤150 步 × 4 方向,可忽略)
  return settleOutsideKeepouts(bounded, point => rectOf(size, point), settle, keepouts, FARM_STAGE_SIZE.width)
    ?? settle(layout.defaultHome)
}

export function clampSceneElementHome(elementId: MovableFarmElementId, home: StagePoint): StagePoint | null {
  return clampElementHome(SCENE_ELEMENT_LAYOUTS[elementId], home)
}

export function resolveSceneElementHome(
  elementId: MovableFarmElementId,
  home: StagePoint,
  keepouts: readonly StageRect[] = SCENE_ELEMENT_KEEPOUTS,
): StagePoint | null {
  return resolveElementHome(SCENE_ELEMENT_LAYOUTS[elementId], home, keepouts)
}

export function sceneElementHomesKey(sceneId: string): string {
  return `scene-element-homes:${sceneId}`
}

/**
 * 读取持久化落点:四类核心物件按固定契约,场景固定装置按传入的布局表;
 * 不认识的 id、损坏坐标一律丢弃,被 UI 盖住太多的旧落点就地挪出来。
 */
export function normalizeSceneElementHomes(
  value: unknown,
  extraLayouts: Readonly<Record<string, SceneElementLayout>> = {},
  keepouts: readonly StageRect[] = SCENE_ELEMENT_KEEPOUTS,
): SceneElementHomes {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const layouts: Record<string, SceneElementLayout> = { ...extraLayouts, ...SCENE_ELEMENT_LAYOUTS }
  return Object.fromEntries(Object.entries(layouts).flatMap(([id, layout]) => {
    const point = source[id]
    if (!point || typeof point !== 'object' || Array.isArray(point)) return []
    const { x, y } = point as Record<string, unknown>
    if (typeof x !== 'number' || typeof y !== 'number') return []
    const home = resolveElementHome(layout, { x, y }, keepouts)
    return home ? [[id, home]] : []
  })) as SceneElementHomes
}
