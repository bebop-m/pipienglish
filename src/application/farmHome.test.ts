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
    expect(await uc.feedDone()).toBe(true)
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
    // 造 3 张已学卡
    await db.cards.bulkPut(
      ['apple', 'banana', 'orange'].map(id => ({
        wordId: id, due: t0, card: { due: new Date(t0), reps: 1 } as never,
      })),
    )
    const chat = await uc.chickChat('chick-a', ['chick-b', 'chick-c'], t0)
    expect(chat).not.toBeNull()
    expect(chat!.others).toHaveLength(2)
    const drawn = [chat!.primary.word, ...chat!.others.map(o => o.word)]
    expect(new Set(drawn).size).toBe(3) // 不重复
    expect(await db.seen.count()).toBe(3) // 见面时间已记
    db.close()
  })

  it('拖放落点持久化为逻辑坐标', async () => {
    const db = freshDb()
    const uc = createFarmUsecases(db)
    await db.chicks.add({ chickId: 'c1', bornOn: '2026-07-17', source: 'hatch', homeX: null, homeY: null })
    await uc.placeChick('c1', { x: 365, y: 470 })
    const vm = await uc.loadViewModel()
    expect(vm.chicksVisible[0].home).toEqual({ x: 365, y: 470 })
    db.close()
  })
})
