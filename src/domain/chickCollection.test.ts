import { describe, expect, it } from 'vitest'
import { collectSceneChicks, toggleFavoriteChick, type ChickCollectionEntry } from './chickCollection'

const chicks = (count: number, sceneId = 'scene-1'): ChickCollectionEntry[] => Array.from(
  { length: count },
  (_, index) => ({ chickId: `chick-${index + 1}`, sceneId, favorite: false, hatchedAt: index + 1 }),
)

describe('每场景 40 只可见集合', () => {
  it('40 只全部可见，第 41 只使最早且未收藏的小鸡进入本场景鸡舍', () => {
    expect(collectSceneChicks(chicks(40), 'scene-1').inCoop).toHaveLength(0)
    const collection = collectSceneChicks(chicks(41), 'scene-1')
    expect(collection.visible).toHaveLength(40)
    expect(collection.visible[0].chickId).toBe('chick-41')
    expect(collection.inCoop.map(chick => chick.chickId)).toEqual(['chick-1'])
  })

  it('最多 8 只最喜欢始终优先，最早的收藏也不会被自动轮换', () => {
    const residents = chicks(45)
    residents[0].favorite = true
    residents[1].favorite = true
    const collection = collectSceneChicks(residents, 'scene-1')
    expect(collection.visible.slice(0, 2).map(chick => chick.chickId)).toEqual(['chick-2', 'chick-1'])
    expect(collection.inCoop.some(chick => chick.favorite)).toBe(false)
    expect(collection.inCoop).toHaveLength(5)
  })

  it('被抓的小鸡真的离开草地，鸡舍不补位，总数不减', () => {
    const residents = chicks(10)
    const collection = collectSceneChicks(residents, 'scene-1', 4)
    expect(collection.visible).toHaveLength(6)
    expect(collection.captured).toHaveLength(4)
    // 最早孵化的先被抓，草地上留下最新的 6 只
    expect(collection.captured.map(chick => chick.chickId)).toEqual([
      'chick-4', 'chick-3', 'chick-2', 'chick-1',
    ])
    expect(collection.inCoop).toHaveLength(0) // 不从鸡舍补位
    const total = collection.visible.length + collection.captured.length + collection.inCoop.length
    expect(total).toBe(residents.length) // 一只都没丢
  })

  it('皮皮收藏的小鸡永远不会被抓走', () => {
    const residents = chicks(6)
    residents[0].favorite = true // 最早孵化，本该最先被抓
    residents[1].favorite = true
    const collection = collectSceneChicks(residents, 'scene-1', 3)
    expect(collection.captured.some(chick => chick.favorite)).toBe(false)
    expect(collection.captured.map(chick => chick.chickId)).toEqual(['chick-5', 'chick-4', 'chick-3'])
    expect(collection.visible.map(chick => chick.chickId)).toEqual(['chick-2', 'chick-1', 'chick-6'])
  })

  it('救援队列长于可抓小鸡数时只抓走实际有的，且不会出现负数', () => {
    expect(collectSceneChicks(chicks(2), 'scene-1', 9)).toMatchObject({
      visible: [],
      captured: [{ chickId: 'chick-2' }, { chickId: 'chick-1' }],
      inCoop: [],
    })
    expect(collectSceneChicks([], 'scene-1', 5).captured).toEqual([])
    expect(collectSceneChicks(chicks(3), 'scene-1', 0).captured).toEqual([])
    expect(collectSceneChicks(chicks(3), 'scene-1', -2).visible).toHaveLength(3)
  })

  it('超过 40 只时先抓草地上的，不动鸡舍里休息的', () => {
    const collection = collectSceneChicks(chicks(45), 'scene-1', 2)
    expect(collection.visible).toHaveLength(38)
    expect(collection.captured.map(chick => chick.chickId)).toEqual(['chick-7', 'chick-6'])
    expect(collection.inCoop).toHaveLength(5) // 仍是最早的 5 只，未被牵连
    expect(collection.inCoop.map(chick => chick.chickId)).toEqual([
      'chick-5', 'chick-4', 'chick-3', 'chick-2', 'chick-1',
    ])
  })

  it('不同场景独立计算且不污染输入集合', () => {
    const sceneOne = chicks(41, 'scene-1')
    const sceneTwo = chicks(3, 'scene-2')
    const all = [...sceneOne, ...sceneTwo]
    const before = structuredClone(all)
    expect(collectSceneChicks(all, 'scene-2').visible).toHaveLength(3)
    expect(collectSceneChicks(all, 'scene-1').inCoop).toHaveLength(1)
    expect(all).toEqual(before)
  })

  it('同一天多只鸡使用精确 hatchedAt，再以 chickId 稳定消除时间戳并列', () => {
    const sameDay = [
      { chickId: 'chick-b', sceneId: 'scene-1', favorite: false, hatchedAt: 100 },
      { chickId: 'chick-c', sceneId: 'scene-1', favorite: false, hatchedAt: 101 },
      { chickId: 'chick-a', sceneId: 'scene-1', favorite: false, hatchedAt: 100 },
    ]
    expect(collectSceneChicks(sameDay, 'scene-1').visible.map(chick => chick.chickId)).toEqual([
      'chick-c', 'chick-a', 'chick-b',
    ])
  })

  it('损坏数据中 40 只全收藏也不崩溃、不取消收藏；第 41 只新鸡安全进入鸡舍', () => {
    const residents = chicks(41)
    for (const chick of residents.slice(0, 40)) chick.favorite = true
    const collection = collectSceneChicks(residents, 'scene-1')
    expect(collection.visible).toHaveLength(40)
    expect(collection.visible.every(chick => chick.favorite)).toBe(true)
    expect(collection.inCoop.map(chick => chick.chickId)).toEqual(['chick-41'])
    expect(residents.filter(chick => chick.favorite)).toHaveLength(40)
  })
})

describe('每场景最多 8 个最喜欢', () => {
  it('从 0 个开始可直接收藏，收藏状态与其他字段保持独立', () => {
    const residents = chicks(1)
    const result = toggleFavoriteChick(residents, 'scene-1', 'chick-1')
    expect(result.status).toBe('updated')
    if (result.status !== 'updated') return
    expect(result.chicks[0]).toEqual({ ...residents[0], favorite: true })
  })

  it('第 8 只可直接收藏；第 9 只要求显式替换，取消时零修改', () => {
    let residents = chicks(9)
    for (let index = 0; index < 8; index += 1) residents[index].favorite = true
    const required = toggleFavoriteChick(residents, 'scene-1', 'chick-9')
    expect(required.status).toBe('replacement-required')
    expect(required.chicks).toBe(residents)
    expect(residents[8].favorite).toBe(false)

    const replaced = toggleFavoriteChick(residents, 'scene-1', 'chick-9', 'chick-1')
    expect(replaced.status).toBe('updated')
    if (replaced.status !== 'updated') return
    residents = replaced.chicks
    expect(residents.find(chick => chick.chickId === 'chick-1')!.favorite).toBe(false)
    expect(residents.find(chick => chick.chickId === 'chick-9')!.favorite).toBe(true)
    expect(residents.filter(chick => chick.favorite)).toHaveLength(8)
  })

  it('收藏计数按场景隔离，拖动所需的其他字段不会被改变', () => {
    const all = [...chicks(8, 'scene-1'), ...chicks(1, 'scene-2')]
    for (const chick of all.filter(chick => chick.sceneId === 'scene-1')) chick.favorite = true
    const result = toggleFavoriteChick(all, 'scene-2', 'chick-1')
    expect(result.status).toBe('updated')
    if (result.status !== 'updated') return
    expect(result.chicks.filter(chick => chick.sceneId === 'scene-1' && chick.favorite)).toHaveLength(8)
    expect(result.chicks.find(chick => chick.sceneId === 'scene-2')!.favorite).toBe(true)
  })

  it('显式替换重复提交保持幂等，不会把刚换入的小鸡反向取消', () => {
    const residents = chicks(9)
    for (const chick of residents.slice(0, 8)) chick.favorite = true
    const first = toggleFavoriteChick(residents, 'scene-1', 'chick-9', 'chick-1')
    expect(first.status).toBe('updated')
    if (first.status !== 'updated') return
    const repeated = toggleFavoriteChick(first.chicks, 'scene-1', 'chick-9', 'chick-1')
    expect(repeated.status).toBe('updated')
    if (repeated.status !== 'updated') return
    expect(repeated.chicks.filter(chick => chick.favorite)).toHaveLength(8)
    expect(repeated.chicks.find(chick => chick.chickId === 'chick-9')?.favorite).toBe(true)
  })
})
