import { describe, expect, it } from 'vitest'
import { hasMeaningfulTrace, toTracePoint, tracePathLength } from './lessonTraceModel'

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
})
