import { describe, expect, it } from 'vitest'
import {
  fittedTraceModelScale,
  hasMeaningfulTrace,
  toTracePoint,
  tracePathLength,
  TRACE_MODEL_SAFE_WIDTH,
} from './lessonTraceModel'

describe('H-2 描红画布模型', () => {
  it('把不同显示尺寸下的指针位置映射到同一逻辑画布并限制边界', () => {
    const bounds = { left: 100, top: 50, width: 410, height: 147.5 }
    expect(toTracePoint(305, 123.75, 20, bounds)).toEqual({ x: 410, y: 147.5, time: 20 })
    expect(toTracePoint(0, 999, -1, bounds)).toEqual({ x: 0, y: 295, time: 0 })
  })

  it('只轻点不算完成，真实移动过的路径可以完成', () => {
    const tap = [[{ x: 10, y: 10, time: 0 }]]
    const line = [[
      { x: 10, y: 10, time: 0 },
      { x: 20, y: 20, time: 10 },
    ]]
    expect(tracePathLength(tap)).toBe(0)
    expect(hasMeaningfulTrace(tap)).toBe(false)
    expect(tracePathLength(line)).toBeCloseTo(Math.sqrt(200))
    expect(hasMeaningfulTrace(line)).toBe(true)
  })

  it('短单词不缩放，长单词等比缩回描红区不被裁掉', () => {
    expect(fittedTraceModelScale(420)).toBe(1)
    expect(fittedTraceModelScale(TRACE_MODEL_SAFE_WIDTH)).toBe(1)

    // pineapple 实测约 980px、supermarket 约 1200px:缩放后必须落回安全宽度内
    for (const width of [980, 1200]) {
      const scale = fittedTraceModelScale(width)
      expect(scale).toBeLessThan(1)
      expect(width * scale).toBeCloseTo(TRACE_MODEL_SAFE_WIDTH)
    }
  })

  it('字体未就绪导致量不到宽度时保持原始字号', () => {
    expect(fittedTraceModelScale(0)).toBe(1)
    expect(fittedTraceModelScale(Number.NaN)).toBe(1)
  })
})
