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
