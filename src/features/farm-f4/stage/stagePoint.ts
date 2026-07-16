// 固定舞台坐标学(F4_IPAD_FIDELITY §3/§4):纯函数,Claude 提供并测试
// CSS 落地(.f4-viewport/.f4-bleed/.f4-stage)与视觉验收归 Codex

import type { StagePoint } from '../../../domain/types'

export const STAGE_W = 1194
export const STAGE_H = 834

/** Split View / 浮窗小于此缩放系数时显示全屏提示(FIDELITY §6) */
export const MIN_COMFORT_SCALE = 0.72

export interface StageTransform {
  scale: number
  left: number
  top: number
}

/** 唯一缩放公式:scale = min(W/1194, H/834),安全区内居中 */
export function computeStageTransform(
  availWidth: number,
  availHeight: number,
  safeLeft = 0,
  safeTop = 0,
): StageTransform {
  const scale = Math.min(availWidth / STAGE_W, availHeight / STAGE_H)
  return {
    scale,
    left: safeLeft + (availWidth - STAGE_W * scale) / 2,
    top: safeTop + (availHeight - STAGE_H * scale) / 2,
  }
}

/** 浏览器事件坐标 → 1194×834 逻辑坐标 */
export function toStagePoint(
  clientX: number,
  clientY: number,
  stageRect: { left: number; top: number },
  scale: number,
): StagePoint {
  return { x: (clientX - stageRect.left) / scale, y: (clientY - stageRect.top) / scale }
}
