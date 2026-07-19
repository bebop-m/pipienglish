import { FAVORITE_CHICK_CAP, VISIBLE_CHICK_CAP } from './types'

export interface ChickCollectionEntry {
  chickId: string
  sceneId: string
  favorite: boolean
  hatchedAt: number
}

export interface SceneChickCollection<T> {
  visible: T[]
  /** 被抓进救援篮的小鸡：仍属本场景、总数不减，只是换了展示位(SPEC §2.5 软化条款③) */
  captured: T[]
  inCoop: T[]
  favoriteCount: number
}

function newestFirst<T extends ChickCollectionEntry>(left: T, right: T): number {
  return right.hatchedAt - left.hatchedAt || left.chickId.localeCompare(right.chickId)
}

/**
 * 最喜欢优先，再按孵化时间从新到旧补足 40；返回值与输入均不被修改。
 *
 * capturedCount = 救援队列长度。被抓的小鸡从**草地上正在显示的非收藏小鸡**里取，
 * 最早孵化的先被抓：皮皮亲手收藏的永远留在草地上，不会因为答错而被带走。
 * 草地因此真的变少一只，鸡舍不补位，`chicksTotal` 不变。
 */
export function collectSceneChicks<T extends ChickCollectionEntry>(
  chicks: readonly T[],
  sceneId: string,
  capturedCount = 0,
): SceneChickCollection<T> {
  const sceneChicks = chicks.filter(chick => chick.sceneId === sceneId)
  const favorites = sceneChicks.filter(chick => chick.favorite).sort(newestFirst)
  const others = sceneChicks.filter(chick => !chick.favorite).sort(newestFirst)
  // 正常写入永远不超过 8 个最喜欢；如果旧备份/损坏数据违反该不变量，
  // 仍优先保留收藏且绝不自动取消。40 个全收藏时，新鸡会安全进入鸡舍。
  const visibleFavorites = favorites.slice(0, VISIBLE_CHICK_CAP)
  const visibleOthers = others.slice(0, Math.max(0, VISIBLE_CHICK_CAP - visibleFavorites.length))

  // 救援队列可能长于草地上的可抓小鸡数(开局鸡少时)，只能抓走实际有的
  const takenCount = Math.max(0, Math.min(Math.trunc(capturedCount) || 0, visibleOthers.length))
  const captured = takenCount === 0 ? [] : visibleOthers.slice(visibleOthers.length - takenCount)
  const visible = [
    ...visibleFavorites,
    ...visibleOthers.slice(0, visibleOthers.length - takenCount),
  ]

  const placedIds = new Set([...visible, ...captured].map(chick => chick.chickId))
  return {
    visible,
    captured,
    inCoop: sceneChicks.filter(chick => !placedIds.has(chick.chickId)).sort(newestFirst),
    favoriteCount: favorites.length,
  }
}

export type FavoriteChange<T> =
  | { status: 'updated'; chicks: T[] }
  | { status: 'replacement-required'; chicks: readonly T[]; replaceableFavoriteIds: string[] }
  | { status: 'invalid-target' | 'invalid-replacement'; chicks: readonly T[] }

/**
 * 点击已收藏小鸡会取消收藏；收藏第 9 只时必须显式提供同场景 replaceFavoriteId。
 * 无效或取消替换不改变输入集合。
 */
export function toggleFavoriteChick<T extends ChickCollectionEntry>(
  chicks: readonly T[],
  sceneId: string,
  chickId: string,
  replaceFavoriteId?: string,
): FavoriteChange<T> {
  const target = chicks.find(chick => chick.chickId === chickId && chick.sceneId === sceneId)
  if (!target) return { status: 'invalid-target', chicks }

  if (target.favorite) {
    // 显式替换可能因快速双击被重复提交；目标已收藏时视为幂等成功，不能反向取消。
    if (replaceFavoriteId !== undefined) return { status: 'updated', chicks: [...chicks] }
    return {
      status: 'updated',
      chicks: chicks.map(chick => chick === target ? { ...chick, favorite: false } : chick),
    }
  }

  const favorites = chicks.filter(chick => chick.sceneId === sceneId && chick.favorite)
  if (favorites.length < FAVORITE_CHICK_CAP) {
    return {
      status: 'updated',
      chicks: chicks.map(chick => chick === target ? { ...chick, favorite: true } : chick),
    }
  }

  if (replaceFavoriteId === undefined) {
    return {
      status: 'replacement-required',
      chicks,
      replaceableFavoriteIds: favorites.map(chick => chick.chickId),
    }
  }
  const replacement = favorites.find(chick => chick.chickId === replaceFavoriteId)
  if (!replacement) return { status: 'invalid-replacement', chicks }
  return {
    status: 'updated',
    chicks: chicks.map(chick => {
      if (chick === target) return { ...chick, favorite: true }
      if (chick === replacement) return { ...chick, favorite: false }
      return chick
    }),
  }
}
