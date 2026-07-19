export const TRACE_LOGICAL_WIDTH = 820
export const TRACE_LOGICAL_HEIGHT = 295

/** 描红底字可用宽度:四线格实测约 744px,再各留 12px 呼吸,超出即被 overflow 裁掉 */
export const TRACE_MODEL_SAFE_WIDTH = 720

/**
 * 长单词(pineapple、supermarket 等)在固定 172px 下会超出描红区并被裁掉。
 * 返回等比缩放系数:放得下返回 1,放不下按宽度比例缩小,竖直居中不变。
 */
export function fittedTraceModelScale(
  measuredWidthPx: number,
  safeWidth = TRACE_MODEL_SAFE_WIDTH,
): number {
  if (!Number.isFinite(measuredWidthPx) || measuredWidthPx <= 0) return 1
  return Math.min(1, safeWidth / measuredWidthPx)
}

export interface TracePoint {
  x: number
  y: number
  time: number
}

export type TraceStroke = TracePoint[]

interface TraceBounds {
  left: number
  top: number
  width: number
  height: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** 浏览器指针坐标 → 描红画布的稳定逻辑坐标。 */
export function toTracePoint(
  clientX: number,
  clientY: number,
  time: number,
  bounds: TraceBounds,
): TracePoint {
  const width = Math.max(1, bounds.width)
  const height = Math.max(1, bounds.height)
  return {
    x: clamp(((clientX - bounds.left) / width) * TRACE_LOGICAL_WIDTH, 0, TRACE_LOGICAL_WIDTH),
    y: clamp(((clientY - bounds.top) / height) * TRACE_LOGICAL_HEIGHT, 0, TRACE_LOGICAL_HEIGHT),
    time: Math.max(0, time),
  }
}

export function tracePathLength(strokes: TraceStroke[]): number {
  return strokes.reduce((total, stroke) => {
    let length = 0
    for (let index = 1; index < stroke.length; index += 1) {
      length += Math.hypot(stroke[index].x - stroke[index - 1].x, stroke[index].y - stroke[index - 1].y)
    }
    return total + length
  }, 0)
}

/** 防止只轻点一下就被当成“写好了”；描红本身始终不评分。 */
export function hasMeaningfulTrace(strokes: TraceStroke[]): boolean {
  return strokes.some((stroke) => stroke.length >= 2) && tracePathLength(strokes) >= 12
}
