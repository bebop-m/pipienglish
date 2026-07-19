import { describe, expect, it } from 'vitest'
import {
  allocateEggToHatch,
  awardHandwritingRoundEgg,
  canAllocateEggToHatch,
  completeDailyLessonWithEggs,
  eggsEarnedFor,
  GAME_EGGS_DAILY_CAP,
  hatchesAt,
  isHatchDue,
  remainingHatchMs,
  settleHatches,
} from './eggEconomy'
import { HATCH_MS, type DailySession, type FarmState } from './types'

const farm = (over: Partial<FarmState> = {}): FarmState => ({
  henName: '咕咕', eggStock: 0, incubating: [], cooking: 'empty', ...over,
})

const session = (over: Partial<DailySession> = {}): DailySession => ({
  date: '2026-07-19',
  reviewIds: [],
  newIds: [],
  doneCount: 0,
  answered: 0,
  correct: 0,
  completed: false,
  ...over,
})

describe('每日与写词鸡蛋收入', () => {
  it('必修固定发 2 颗，且 completed 使重复提交幂等', () => {
    expect(eggsEarnedFor(8)).toBe(2)
    expect(eggsEarnedFor(33)).toBe(2)

    const first = completeDailyLessonWithEggs(session(), farm({ eggStock: 4 }))
    expect(first.awarded).toBe(2)
    expect(first.session.completed).toBe(true)
    expect(first.farm.eggStock).toBe(6)

    const duplicate = completeDailyLessonWithEggs(first.session, first.farm)
    expect(duplicate).toEqual({ session: first.session, farm: first.farm, awarded: 0 })
    expect(duplicate.session).toBe(first.session)
    expect(duplicate.farm).toBe(first.farm)
  })

  it('同一本地日前 10 轮各发 1 颗，第 11 轮起纯加练', () => {
    let currentSession = session({ completed: true })
    let currentFarm = farm()
    for (let round = 1; round <= GAME_EGGS_DAILY_CAP; round += 1) {
      const result = awardHandwritingRoundEgg(currentSession, currentFarm, '2026-07-19')
      expect(result.awarded).toBe(1)
      expect(result.session.gameEggs).toBe(round)
      currentSession = result.session
      currentFarm = result.farm
    }
    expect(currentFarm.eggStock).toBe(10)

    const practiceOnly = awardHandwritingRoundEgg(currentSession, currentFarm, '2026-07-19')
    expect(practiceOnly.awarded).toBe(0)
    expect(practiceOnly.session).toBe(currentSession)
    expect(practiceOnly.farm).toBe(currentFarm)
  })

  it('未完成必修或传入的本地日不同均不发游戏蛋', () => {
    const locked = awardHandwritingRoundEgg(session(), farm(), '2026-07-19')
    expect(locked.awarded).toBe(0)
    const wrongDay = awardHandwritingRoundEgg(session({ completed: true }), farm(), '2026-07-20')
    expect(wrongDay.awarded).toBe(0)
  })
})

describe('单巢与 24 小时边界', () => {
  it('仅在有库存且唯一巢位空闲时允许放蛋', () => {
    expect(canAllocateEggToHatch(farm({ eggStock: 1 }))).toBe(true)
    expect(canAllocateEggToHatch(farm({ eggStock: 0 }))).toBe(false)
    expect(canAllocateEggToHatch(farm({ eggStock: 2, incubating: [{ slot: 0, placedAt: 0 }] }))).toBe(false)

    const next = allocateEggToHatch(farm({ eggStock: 2 }), 1000)!
    expect(next).toMatchObject({ eggStock: 1, incubating: [{ slot: 0, placedAt: 1000 }] })
    expect(allocateEggToHatch(next, 2000)).toBeNull()
  })

  it('派生到期时间；差 1ms 未到，恰好 24h 到期', () => {
    const placedAt = 1_000_000
    const dueAt = placedAt + HATCH_MS
    expect(hatchesAt(placedAt)).toBe(dueAt)
    expect(isHatchDue(placedAt, dueAt - 1)).toBe(false)
    expect(remainingHatchMs(placedAt, dueAt - 1)).toBe(1)
    expect(isHatchDue(placedAt, dueAt)).toBe(true)
    expect(remainingHatchMs(placedAt, dueAt)).toBe(0)

    const state = farm({ incubating: [{ slot: 0, placedAt }] })
    expect(settleHatches(state, dueAt - 1)).toEqual({ farm: state, hatched: 0 })
    expect(settleHatches(state, dueAt)).toMatchObject({ farm: { incubating: [] }, hatched: 1 })
  })
})
