import { describe, expect, it, vi } from 'vitest'
import {
  canStartMeal,
  clearReadyMeal,
  cookingDone,
  refundMealForTravel,
  RECIPE_EGG_COSTS,
  startMeal,
  type MealStartState,
} from './meals'

const state = (over: Partial<MealStartState> = {}): MealStartState => ({
  eggStock: 20,
  currentSceneChickCount: 1,
  cookingMeal: null,
  ...over,
})

describe('三档料理成本与开始资格', () => {
  it('价格固定为 1/5/20，并在开始时一次性扣除且保存 raw', () => {
    expect(RECIPE_EGG_COSTS).toEqual({
      single_fried_egg: 1,
      picnic_platter: 5,
      celebration_feast: 20,
    })
    for (const [recipeId, eggCost] of Object.entries(RECIPE_EGG_COSTS)) {
      const result = startMeal(state(), recipeId as keyof typeof RECIPE_EGG_COSTS, () => 123)
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.state.eggStock).toBe(20 - eggCost)
      expect(result.meal).toEqual({ recipeId, eggCost, phase: 'raw', startedAt: 123 })
    }
  })

  it('余额不足、当前场景无鸡或已有料理均拒绝且不扣蛋、不读取时间', () => {
    const now = vi.fn(() => 123)
    const insufficient = state({ eggStock: 4 })
    expect(startMeal(insufficient, 'picnic_platter', now)).toEqual({
      ok: false, state: insufficient, reason: 'insufficient-eggs',
    })
    const noChicks = state({ currentSceneChickCount: 0 })
    expect(startMeal(noChicks, 'single_fried_egg', now)).toEqual({
      ok: false, state: noChicks, reason: 'no-chicks',
    })
    const first = startMeal(state(), 'single_fried_egg', () => 1)
    if (!first.ok) return
    expect(startMeal(first.state, 'single_fried_egg', now)).toEqual({
      ok: false, state: first.state, reason: 'meal-in-progress',
    })
    expect(now).not.toHaveBeenCalled()
  })

  it('canStartMeal 使用相同资格守卫', () => {
    expect(canStartMeal(state({ eggStock: 5 }), 'picnic_platter')).toBe(true)
    expect(canStartMeal(state({ eggStock: 4 }), 'picnic_platter')).toBe(false)
    expect(canStartMeal(state({ currentSceneChickCount: 0 }), 'single_fried_egg')).toBe(false)
  })

  it('raw 只推进一次到 ready，served 只接受 ready', () => {
    const started = startMeal(state(), 'picnic_platter', () => 123)
    if (!started.ok) return
    const ready = cookingDone(started.meal)
    expect(ready).toEqual({ ...started.meal, phase: 'ready' })
    expect(cookingDone(ready)).toBeNull()
    expect(clearReadyMeal(started.meal)).toBe(false)
    expect(clearReadyMeal(ready)).toBe(true)
  })

  it('旅行按落库成本全额退款并清空；对已清空状态重复调用不再退款', () => {
    const started = startMeal(state(), 'celebration_feast', () => 123)
    if (!started.ok) return
    const first = refundMealForTravel(started.state)
    expect(first).toMatchObject({ refunded: true, refundedEggs: 20 })
    expect(first.state.eggStock).toBe(20)
    expect(first.state.cookingMeal).toBeNull()

    const repeated = refundMealForTravel(first.state)
    expect(repeated).toEqual({ state: first.state, refundedEggs: 0, refunded: false })
  })
})
