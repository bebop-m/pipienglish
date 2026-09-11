import { describe, expect, it } from 'vitest'
import {
  allocateEggToHatch,
  awardHandwritingRoundEgg,
  canAllocateEggToHatch,
  completeDailyLessonWithEggs,
  eggsEarnedFor,
  GAME_ROUNDS_DAILY_CAP,
  nextGameRoundEggs,
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
  it('必修固定发 1 颗(F4-CHG-034)，且 completed 使重复提交幂等', () => {
    expect(eggsEarnedFor(8)).toBe(1)
    expect(eggsEarnedFor(33)).toBe(1)

    const first = completeDailyLessonWithEggs(session(), farm({ eggStock: 4 }))
    expect(first.awarded).toBe(1)
    expect(first.session.completed).toBe(true)
    expect(first.farm.eggStock).toBe(5)

    const duplicate = completeDailyLessonWithEggs(first.session, first.farm)
    expect(duplicate).toEqual({ session: first.session, farm: first.farm, awarded: 0 })
    expect(duplicate.session).toBe(first.session)
    expect(duplicate.farm).toBe(first.farm)
  })

  it('同一本地日第一轮发 2 颗、第 2–10 轮各 1 颗，第 11 轮起纯加练', () => {
    let currentSession = session({ completed: true })
    let currentFarm = farm()
    expect(nextGameRoundEggs(currentSession, '2026-07-19')).toBe(2)
    for (let round = 1; round <= GAME_ROUNDS_DAILY_CAP; round += 1) {
      const result = awardHandwritingRoundEgg(currentSession, currentFarm, '2026-07-19')
      expect(result.awarded).toBe(round === 1 ? 2 : 1)
      expect(result.session.gameRounds).toBe(round)
      expect(result.session.gameEggs).toBe(round + 1)
      currentSession = result.session
      currentFarm = result.farm
    }
    expect(currentFarm.eggStock).toBe(11)
    expect(nextGameRoundEggs(currentSession, '2026-07-19')).toBe(0)

    const practiceOnly = awardHandwritingRoundEgg(currentSession, currentFarm, '2026-07-19')
    expect(practiceOnly.awarded).toBe(0)
    expect(practiceOnly.session).toBe(currentSession)
    expect(practiceOnly.farm).toBe(currentFarm)
  })

  it('更新前的旧会话没有 gameRounds:按蛋数推算轮数,不会再送一次第一轮双倍', () => {
    const legacy = session({ completed: true, gameEggs: 3 })
    expect(nextGameRoundEggs(legacy, '2026-07-19')).toBe(1)
    const result = awardHandwritingRoundEgg(legacy, farm(), '2026-07-19')
    expect(result.session).toMatchObject({ gameRounds: 4, gameEggs: 4 })
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
