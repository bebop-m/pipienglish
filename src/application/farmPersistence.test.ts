import { describe, expect, it } from 'vitest'
import type { FarmState } from '../domain/types'
import { DEFAULT_FARM, PipiDB, getKV, setKV } from './db'
import {
  legacyFarmStateToV3,
  type FarmStateV3,
  type MigrationContext,
} from './farmPersistence'

const context: MigrationContext = { now: 987_654_321, today: '2026-07-19' }

describe('legacyFarmStateToV3 兼容边界', () => {
  it('时间完全由 MigrationContext 注入，转换结果可确定重放', () => {
    const legacy: FarmState = {
      henName: '咕咕',
      eggStock: 4,
      incubating: [],
      cooking: 'raw',
    }
    const first = legacyFarmStateToV3(legacy, context)
    const second = legacyFarmStateToV3(structuredClone(legacy), context)
    expect(first).toEqual(second)
    expect(first.cookingMeal?.startedAt).toBe(context.now)
  })

  it('陈旧多巢视图重复回写不重复退款且保留全部 v3 隐藏状态', () => {
    const current: FarmStateV3 = {
      henName: '咕咕',
      eggStock: 9,
      incubating: { placedAt: 100, rarity: 'special', variantId: 'special-hidden-a' },
      cookingMeal: null,
      activeSceneId: 'scene-3',
      acknowledgedSceneChapter: 3,
      normalHatchStreak: 8,
      nonSpecialHatchStreak: 34,
    }
    const staleLegacy: FarmState = {
      henName: '咕咕',
      eggStock: 7,
      incubating: [
        { slot: 0, placedAt: 300 },
        { slot: 1, placedAt: 100 },
        { slot: 2, placedAt: 200 },
      ],
      cooking: 'empty',
    }

    const once = legacyFarmStateToV3(staleLegacy, context, current)
    const twice = legacyFarmStateToV3(staleLegacy, context, once)
    expect(once).toEqual(current)
    expect(twice).toEqual(current)
    expect(twice.eggStock + Number(twice.incubating !== null)).toBe(10)
  })

  it('getKV 旧视图经 setKV 回写不会丢失隐藏外观、保底和场景状态', async () => {
    const db = new PipiDB(`pipitest-compat-${Date.now()}-${Math.random()}`)
    const canonical: FarmStateV3 = {
      henName: '咕咕',
      eggStock: 5,
      incubating: { placedAt: 123, rarity: 'color', variantId: 'color-hidden-a' },
      cookingMeal: null,
      activeSceneId: 'scene-2',
      acknowledgedSceneChapter: 2,
      normalHatchStreak: 0,
      nonSpecialHatchStreak: 21,
    }
    await db.kv.put({ key: 'farmState', value: canonical })

    const legacy = await getKV<FarmState>(db, 'farmState', DEFAULT_FARM)
    expect(legacy.incubating).toEqual([{ slot: 0, placedAt: 123 }])
    await setKV(db, 'farmState', { ...legacy, eggStock: legacy.eggStock + 1 })

    const stored = (await db.kv.get('farmState'))!.value as FarmStateV3
    expect(stored).toEqual({ ...canonical, eggStock: 6 })
    db.close()
  })
})
