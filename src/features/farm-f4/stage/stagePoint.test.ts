import { describe, expect, it } from 'vitest'
import { computeStageTransform, toStagePoint, MIN_COMFORT_SCALE, STAGE_H, STAGE_W } from './stagePoint'

describe('computeStageTransform(FIDELITY §3 唯一缩放公式)', () => {
  it('1194×834 → scale 1,无偏移', () => {
    expect(computeStageTransform(1194, 834)).toEqual({ scale: 1, left: 0, top: 0 })
  })

  it('2388×1668(2×)→ scale 2', () => {
    expect(computeStageTransform(2388, 1668).scale).toBe(2)
  })

  it('iPad Pro 13 横屏(1366×1024,4:3):宽比更紧,以宽定 scale,垂直居中留背景延展', () => {
    const t = computeStageTransform(1366, 1024)
    expect(t.scale).toBeCloseTo(1366 / STAGE_W, 5)
    expect(t.left).toBeCloseTo(0, 5)
    expect(t.top).toBeCloseTo((1024 - STAGE_H * t.scale) / 2, 5)
  })

  it('安全区偏移叠加到居中结果上', () => {
    const t = computeStageTransform(1194, 834, 20, 10)
    expect(t.left).toBe(20)
    expect(t.top).toBe(10)
  })

  it('Split View 一半宽(~600×834)低于舒适阈值', () => {
    expect(computeStageTransform(600, 834).scale).toBeLessThan(MIN_COMFORT_SCALE)
  })
})

describe('toStagePoint(FIDELITY §4)', () => {
  it('事件坐标 → 逻辑坐标,与缩放互逆', () => {
    const scale = 0.75
    const rect = { left: 100, top: 50 }
    const logical = { x: 615, y: 530 } // 母版母鸡初始点位
    const client = { x: rect.left + logical.x * scale, y: rect.top + logical.y * scale }
    const p = toStagePoint(client.x, client.y, rect, scale)
    expect(p.x).toBeCloseTo(logical.x, 5)
    expect(p.y).toBeCloseTo(logical.y, 5)
  })
})
