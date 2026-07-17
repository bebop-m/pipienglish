import { describe, expect, it } from 'vitest'
import { allocateEggToHatch, eggsEarnedFor, feedDone, fryingDone, putEggInPan, settleHatches } from './eggEconomy'
import { HATCH_MS, type FarmState } from './types'

const farm = (over: Partial<FarmState> = {}): FarmState => ({
  henName: '咕咕', eggStock: 0, incubating: [], cooking: 'empty', ...over,
})

describe('eggsEarnedFor', () => {
  it('蛋经济 v2:必修完成固定 1 颗,多劳多得走写词游戏侧(日上限 5)', () => {
    expect(eggsEarnedFor(8)).toBe(1)
    expect(eggsEarnedFor(14)).toBe(1)
    expect(eggsEarnedFor(33)).toBe(1)
  })
})

describe('allocateEggToHatch', () => {
  it('占用编号最小的空巢位并扣库存', () => {
    const next = allocateEggToHatch(farm({ eggStock: 2, incubating: [{ slot: 1, placedAt: 0 }] }), 1000)!
    expect(next.eggStock).toBe(1)
    expect(next.incubating.map(e => e.slot).sort()).toEqual([0, 1])
    expect(next.incubating.find(e => e.slot === 0)!.placedAt).toBe(1000)
  })

  it('库存为 0 或巢位满时拒绝', () => {
    expect(allocateEggToHatch(farm({ eggStock: 0 }), 0)).toBeNull()
    const full = farm({
      eggStock: 5,
      incubating: [{ slot: 0, placedAt: 0 }, { slot: 1, placedAt: 0 }, { slot: 2, placedAt: 0 }],
    })
    expect(allocateEggToHatch(full, 0)).toBeNull()
  })
})

describe('settleHatches(24 小时规则,V-1 裁决)', () => {
  it('满 24h 破壳,不满不动;边界恰好 24h 算破壳', () => {
    const t0 = 1_000_000
    const state = farm({
      incubating: [
        { slot: 0, placedAt: t0 },              // 恰好到期
        { slot: 1, placedAt: t0 + 1 },          // 差 1ms
        { slot: 2, placedAt: t0 - 5000 },       // 早已到期
      ],
    })
    const { farm: next, hatched } = settleHatches(state, t0 + HATCH_MS)
    expect(hatched).toBe(2)
    expect(next.incubating.map(e => e.slot)).toEqual([1])
  })

  it('无到期时原样返回', () => {
    const state = farm({ incubating: [{ slot: 0, placedAt: 100 }] })
    expect(settleHatches(state, 200).hatched).toBe(0)
  })
})

describe('煎蛋状态机', () => {
  it('empty→raw 扣库存;raw→ready;ready→empty', () => {
    const raw = putEggInPan(farm({ eggStock: 1 }))!
    expect(raw).toMatchObject({ eggStock: 0, cooking: 'raw' })
    const ready = fryingDone(raw)!
    expect(ready.cooking).toBe('ready')
    expect(feedDone(ready)!.cooking).toBe('empty')
  })

  it('守卫:空库存不能下锅;锅非空不能再下;非 ready 不能喂', () => {
    expect(putEggInPan(farm({ eggStock: 0 }))).toBeNull()
    expect(putEggInPan(farm({ eggStock: 1, cooking: 'raw' }))).toBeNull()
    expect(fryingDone(farm({ cooking: 'empty' }))).toBeNull()
    expect(feedDone(farm({ cooking: 'raw' }))).toBeNull()
  })
})
