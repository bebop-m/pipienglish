// 首页用例全链路:完成学习 → 发蛋 → 分配 → 24h 孵化 → 农场 +1(fake-indexeddb)

import { describe, expect, it } from 'vitest'
import { PipiDB } from './db'
import { createFarmUsecases } from './usecases/farmHome'
import { HATCH_MS } from '../domain/types'

let dbSeq = 0
const freshDb = () => new PipiDB(`pipitest-farm-${Date.now()}-${dbSeq++}`)

describe('首页三状态与蛋经济全链路', () => {
  it('first_visit → 起名 → daily_incomplete → 完成 → daily_complete(发蛋+连胜)', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    const t0 = Date.now()

    await uc.clockGuard(t0)
    let vm = await uc.loadViewModel(t0)
    expect(vm.state).toBe('first_visit')
    expect(vm.dailyTarget).toBe(4) // 全新词库,今日 4 个新词
    expect(vm.reviewCountToday).toBe(0)

    await uc.nameHen('咕咕')
    vm = await uc.loadViewModel(t0)
    expect(vm.state).toBe('daily_incomplete')
    expect(vm.dayNumber).toBe(1)

    await uc.completeDailyLesson(t0)
    vm = await uc.loadViewModel(t0)
    expect(vm.state).toBe('daily_complete')
    expect(vm.eggStock).toBe(1) // 8 个任务项 < 15 → 1 颗
    expect(vm.streak).toBe(1)

    // 同日重复完成幂等
    await uc.completeDailyLesson(t0)
    vm = await uc.loadViewModel(t0)
    expect(vm.eggStock).toBe(1)
    expect(vm.streak).toBe(1)
    db.close()
  })

  it('分配孵化 → 不满 24h 不破壳 → 满 24h 破壳成小鸡', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    const t0 = Date.now()

    await uc.clockGuard(t0)
    await uc.nameHen('咕咕')
    await uc.completeDailyLesson(t0)
    expect(await uc.allocateEggToHatch(t0)).toBe(true)

    let vm = await uc.loadViewModel(t0)
    expect(vm.eggStock).toBe(0)
    expect(vm.incubating).toHaveLength(1)
    expect(vm.incubating[0].hatchesAt).toBe(t0 + HATCH_MS)

    // 23 小时后:还没破壳
    await uc.clockGuard(t0 + HATCH_MS - 3600_000)
    vm = await uc.loadViewModel(t0 + HATCH_MS - 3600_000)
    expect(vm.chicksTotal).toBe(0)
    expect(vm.incubating).toHaveLength(1)

    // 24 小时后:破壳,农场 +1,巢位释放;新小鸡 isNewToday
    const t1 = t0 + HATCH_MS + 1000
    const { hatched } = await uc.clockGuard(t1)
    expect(hatched).toBe(1)
    vm = await uc.loadViewModel(t1)
    expect(vm.chicksTotal).toBe(1)
    expect(vm.incubating).toHaveLength(0)
    expect(vm.chicksVisible[0].isNewToday).toBe(true)
    db.close()
  })

  it('并发时钟守卫对同一颗到期蛋只结算一次', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    const t0 = Date.now()
    await uc.clockGuard(t0)
    await uc.nameHen('咕咕')
    await uc.completeDailyLesson(t0)
    await uc.allocateEggToHatch(t0)

    const results = await Promise.all([
      uc.clockGuard(t0 + HATCH_MS + 1),
      uc.clockGuard(t0 + HATCH_MS + 1),
    ])
    expect(results.reduce((sum, result) => sum + result.hatched, 0)).toBe(1)
    expect(await db.chicks.count()).toBe(1)
    expect((await uc.loadViewModel(t0 + HATCH_MS + 1)).incubating).toHaveLength(0)
    db.close()
  })

  it('两日闭环:第一天孵化 → 第二天破壳 → 再赚蛋 → 煎蛋喂真实小鸡', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    const dayOne = new Date('2026-07-17T09:00:00+08:00').getTime()

    await uc.clockGuard(dayOne)
    await uc.nameHen('咕咕')
    await uc.completeDailyLesson(dayOne)
    expect((await uc.loadViewModel(dayOne)).eggStock).toBe(1)
    expect(await uc.allocateEggToHatch(dayOne)).toBe(true)

    await uc.clockGuard(dayOne + HATCH_MS - 1)
    expect((await uc.loadViewModel(dayOne + HATCH_MS - 1)).chicksTotal).toBe(0)

    const dayTwo = dayOne + HATCH_MS + 1
    expect((await uc.clockGuard(dayTwo)).hatched).toBe(1)
    let vm = await uc.loadViewModel(dayTwo)
    expect(vm.state).toBe('daily_incomplete')
    expect(vm.dayNumber).toBe(2)
    expect(vm.chicksTotal).toBe(1)
    expect(vm.incubating).toHaveLength(0)

    await uc.completeDailyLesson(dayTwo)
    vm = await uc.loadViewModel(dayTwo)
    expect(vm.state).toBe('daily_complete')
    expect(vm.streak).toBe(2)
    expect(vm.eggStock).toBe(1)

    expect(await uc.putEggInPan()).toBe(true)
    expect(await uc.fryingDone()).toBe(true)
    expect(await uc.feedDone(vm.chicksVisible[0].chickId)).toBe(true)
    vm = await uc.loadViewModel(dayTwo)
    expect(vm.cooking).toBe('empty')
    expect(vm.eggStock).toBe(0)
    expect(vm.chicksTotal).toBe(1)
    db.close()
  })

  it('煎蛋崩溃恢复:落库值只有 raw/ready,cooking 动画态重启后回 raw', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    const t0 = Date.now()
    await uc.clockGuard(t0)
    await uc.nameHen('咕咕')
    await uc.completeDailyLesson(t0)

    expect(await uc.putEggInPan()).toBe(true)
    // 模拟"正在煎(动画中)崩溃重启":库里仍是 raw
    let vm = await uc.loadViewModel(t0)
    expect(vm.cooking).toBe('raw')
    expect(vm.eggStock).toBe(0) // 蛋已下锅,没有消失

    expect(await uc.fryingDone()).toBe(true)
    expect(await uc.feedDone()).toBe(false) // 还没有真实小鸡,煎蛋会安全保留
    await db.chicks.add({ chickId: 'feed-target', bornOn: '2026-07-17', source: 'hatch', homeX: null, homeY: null })
    expect(await uc.feedDone('feed-target')).toBe(true)
    vm = await uc.loadViewModel(t0)
    expect(vm.cooking).toBe('empty')

    // 守卫:空锅不能重复喂
    expect(await uc.feedDone()).toBe(false)
    db.close()
  })

  it('群聊:抽词更新见面时间,primary 与 others 数量正确', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    const t0 = Date.now()
    await db.chicks.bulkAdd([
      { chickId: 'chick-a', bornOn: '2026-07-17', source: 'hatch', homeX: null, homeY: null },
      { chickId: 'chick-b', bornOn: '2026-07-17', source: 'hatch', homeX: null, homeY: null },
      { chickId: 'chick-c', bornOn: '2026-07-17', source: 'hatch', homeX: null, homeY: null },
    ])
    // 造 3 张有效已学卡和 1 张已不在当前词库的旧卡
    await db.cards.bulkPut(
      ['apple', 'banana', 'orange', 'legacy-missing'].map(id => ({
        wordId: id, due: t0, card: { due: new Date(t0), reps: 1 } as never,
      })),
    )
    const chat = await uc.chickChat('chick-a', ['chick-b', 'missing-chick', 'chick-b', 'chick-c'], t0)
    expect(chat).not.toBeNull()
    expect(chat!.others).toHaveLength(2)
    const drawn = [chat!.primary.word, ...chat!.others.map(o => o.word)]
    expect(new Set(drawn).size).toBe(3) // 不重复
    expect(await db.seen.count()).toBe(3) // 见面时间已记;无效旧卡没有进入气泡
    expect((await db.seen.toArray()).every(row => row.lastSeenAt === t0)).toBe(true)

    expect(await uc.chickChat('missing-chick', [], t0 + 1)).toBeNull()
    expect(await db.seen.count()).toBe(3)
    db.close()
  })

  it('拖放落点持久化为逻辑坐标', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    await db.chicks.add({ chickId: 'c1', bornOn: '2026-07-17', source: 'hatch', homeX: null, homeY: null })
    expect(await uc.placeChick('c1', { x: 365, y: 470 })).toBe(true)
    expect(await uc.placeChick('missing', { x: 1, y: 2 })).toBe(false)
    expect(await uc.placeChick('c1', { x: Number.NaN, y: 2 })).toBe(false)
    const vm = await createFarmUsecases(db).loadViewModel()
    expect(vm.chicksVisible[0].home).toEqual({ x: 365, y: 470 })
    db.close()
  })

  it('40 只可见上限的数据侧真实化,其余计入鸡舍', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    await db.chicks.bulkAdd(Array.from({ length: 43 }, (_, index) => ({
      chickId: `cap-${index}`,
      bornOn: `2026-07-${String((index % 28) + 1).padStart(2, '0')}`,
      source: 'hatch' as const,
      homeX: null,
      homeY: null,
    })))
    const vm = await uc.loadViewModel()
    expect(vm.chicksTotal).toBe(43)
    expect(vm.chicksVisible).toHaveLength(40)
    expect(vm.chicksInCoop).toBe(3)
    db.close()
  })
})
