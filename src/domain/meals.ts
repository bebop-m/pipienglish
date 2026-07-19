export type RecipeId = 'single_fried_egg' | 'picnic_platter' | 'celebration_feast'
export type MealPhase = 'raw' | 'ready'
export type MealEggCost = 1 | 5 | 20

export interface CookingMeal {
  recipeId: RecipeId
  eggCost: MealEggCost
  phase: MealPhase
  startedAt: number
}

export interface MealStartState {
  eggStock: number
  currentSceneChickCount: number
  cookingMeal: CookingMeal | null
}

export interface MealTravelState {
  eggStock: number
  cookingMeal: CookingMeal | null
}

export interface RefundedMealForTravel<TState extends MealTravelState> {
  state: TState
  refundedEggs: MealEggCost | 0
  refunded: boolean
}

export type StartMealResult =
  | { ok: true; state: MealStartState; meal: CookingMeal }
  | {
      ok: false
      state: MealStartState
      reason: 'insufficient-eggs' | 'no-chicks' | 'meal-in-progress'
    }

export const RECIPE_EGG_COSTS: Readonly<Record<RecipeId, MealEggCost>> = {
  single_fried_egg: 1,
  picnic_platter: 5,
  celebration_feast: 20,
}

export function canStartMeal(state: MealStartState, recipeId: RecipeId): boolean {
  return state.cookingMeal === null
    && state.currentSceneChickCount > 0
    && state.eggStock >= RECIPE_EGG_COSTS[recipeId]
}

/** 开始时一次性扣除 1/5/20 颗并持久化 raw；时间源由应用层注入。 */
export function startMeal(
  state: MealStartState,
  recipeId: RecipeId,
  now: () => number,
): StartMealResult {
  if (state.cookingMeal !== null) return { ok: false, state, reason: 'meal-in-progress' }
  if (state.currentSceneChickCount <= 0) return { ok: false, state, reason: 'no-chicks' }
  const eggCost = RECIPE_EGG_COSTS[recipeId]
  if (state.eggStock < eggCost) return { ok: false, state, reason: 'insufficient-eggs' }
  const meal: CookingMeal = { recipeId, eggCost, phase: 'raw', startedAt: now() }
  return {
    ok: true,
    meal,
    state: { ...state, eggStock: state.eggStock - eggCost, cookingMeal: meal },
  }
}

/** cooking 只属于运行时动画；落库的 raw 在动画完成后幂等推进为 ready。 */
export function cookingDone(meal: CookingMeal | null): CookingMeal | null {
  if (!meal || meal.phase !== 'raw') return null
  return { ...meal, phase: 'ready' }
}

/** served 是业务动作而非持久化状态；只有 ready 料理可以在享用后清空。 */
export function clearReadyMeal(meal: CookingMeal | null): meal is CookingMeal & { phase: 'ready' } {
  return meal?.phase === 'ready'
}

/**
 * 旅行退款纯规则。无料理时保持原对象且不退款；有 raw/ready 时按落库 eggCost
 * 全额退回并清空。应用层必须与实际旅行推进放在同一事务中提交。
 */
export function refundMealForTravel<TState extends MealTravelState>(
  state: TState,
): RefundedMealForTravel<TState> {
  const meal = state.cookingMeal
  if (!meal) return { state, refundedEggs: 0, refunded: false }
  return {
    state: { ...state, eggStock: state.eggStock + meal.eggCost, cookingMeal: null },
    refundedEggs: meal.eggCost,
    refunded: true,
  }
}
