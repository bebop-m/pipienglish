import { describe, expect, it } from 'vitest'
import { assembleViewModel, type FarmSnapshot } from './viewmodel'
import { defaultFarmStateV3 } from './farmPersistence'

function snapshot(doneCount: number): FarmSnapshot {
  return {
    farm: { ...defaultFarmStateV3(), henName: '咕咕' },
    meta: { streak: 2, lastDoneDate: null, totalDays: 2, installDate: '2026-07-15' },
    motionEnabled: true,
    session: {
      date: '2026-07-17',
      reviewIds: ['old-a', 'old-b'],
      newIds: ['new-a', 'new-b'],
      doneCount,
      answered: doneCount,
      correct: doneCount,
      completed: false,
    },
    chicksTotal: 0,
    latestChicks: [],
    rescueCount: 0,
    now: new Date('2026-07-17T09:00:00+08:00').getTime(),
  }
}

describe('F4 首页进度 ViewModel', () => {
  it('区分学习步骤、完成朋友数与今日新词数', () => {
    const afterReviews = assembleViewModel(snapshot(2))
    expect(afterReviews.totalItemsToday).toBe(4)
    expect(afterReviews.learnedToday).toBe(2)
    expect(afterReviews.newWordsLearnedToday).toBe(0)

    const afterNewWordIntro = assembleViewModel(snapshot(3))
    expect(afterNewWordIntro.learnedToday).toBe(2)
    expect(afterNewWordIntro.newWordsLearnedToday).toBe(0)

    const afterNewWordQuiz = assembleViewModel(snapshot(4))
    expect(afterNewWordQuiz.learnedToday).toBe(3)
    expect(afterNewWordQuiz.newWordsLearnedToday).toBe(1)
    expect(afterNewWordQuiz.eggsEarnedToday).toBe(1)
  })

  it('守护卡:完成日暴露张数、今日用卡与今日发卡(F4-CHG-034)', () => {
    const protectedDay = snapshot(4)
    protectedDay.session.completed = true
    protectedDay.meta = {
      streak: 7, lastDoneDate: '2026-07-17', totalDays: 9, installDate: '2026-07-01',
      freezeCards: 1, lastShieldUsedOn: '2026-07-17',
    }
    const vm = assembleViewModel(protectedDay)
    expect(vm.freezeCards).toBe(1)
    expect(vm.streakProtectedToday).toBe(true)
    expect(vm.shieldEarnedToday).toBe(true)

    const plain = assembleViewModel(snapshot(0))
    expect(plain.freezeCards).toBe(0)
    expect(plain.streakProtectedToday).toBe(false)
    expect(plain.shieldEarnedToday).toBe(false)
  })

  it('孵化 VM 只暴露派生时间，不提前泄露隐藏外观', () => {
    const state = snapshot(0)
    state.farm.incubating = {
      placedAt: state.now - 23 * 60 * 60 * 1000,
      rarity: 'special',
      variantId: 'hidden-special',
    }
    const vm = assembleViewModel(state)
    expect(vm.incubating).toEqual({
      placedAt: state.now - 23 * 60 * 60 * 1000,
      hatchesAt: state.now + 60 * 60 * 1000,
      remainingMs: 60 * 60 * 1000,
    })
    expect(vm.incubating).not.toHaveProperty('rarity')
    expect(vm.incubating).not.toHaveProperty('variantId')
  })

  it('暴露规范 CookingMeal 与三档可用性，不制造煎蛋库存', () => {
    const state = snapshot(0)
    state.farm.eggStock = 5
    state.chicksTotal = 1
    let vm = assembleViewModel(state)
    expect(vm.cookingMeal).toBeNull()
    expect(vm.availableRecipes).toEqual([
      { recipeId: 'single_fried_egg', eggCost: 1, enabled: true },
      { recipeId: 'picnic_platter', eggCost: 5, enabled: true },
      { recipeId: 'celebration_feast', eggCost: 20, enabled: false },
    ])

    state.farm.cookingMeal = { recipeId: 'picnic_platter', eggCost: 5, phase: 'raw', startedAt: state.now }
    vm = assembleViewModel(state)
    expect(vm.cookingMeal).toEqual(state.farm.cookingMeal)
    expect(vm.availableRecipes.every(recipe => !recipe.enabled)).toBe(true)
  })
})
