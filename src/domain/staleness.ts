// 陈旧度加权抽词(SPEC §2.4):P ∝ (距上次见面天数 + 1)²
// 供写词游戏与小鸡群聊共用;"见面"= 必修复习 / 写词游戏 / 点小鸡,取最近一次

export interface SeenLike {
  wordId: string
  lastSeenAt: number // 毫秒时间戳;从未见过用 0
}

const DAY_MS = 24 * 60 * 60 * 1000

export function stalenessWeight(lastSeenAt: number, now: number): number {
  const days = Math.max(0, (now - lastSeenAt) / DAY_MS)
  return (days + 1) ** 2
}

/** 不放回加权抽样;rng 可注入以便测试 */
export function weightedSample(
  pool: SeenLike[],
  n: number,
  now: number,
  rng: () => number = Math.random,
): string[] {
  const items = pool.map(p => ({ id: p.wordId, w: stalenessWeight(p.lastSeenAt, now) }))
  const picked: string[] = []
  while (picked.length < n && items.length > 0) {
    const total = items.reduce((sum, item) => sum + item.w, 0)
    let r = rng() * total
    let index = 0
    for (; index < items.length - 1; index++) {
      r -= items[index].w
      if (r <= 0) break
    }
    picked.push(items[index].id)
    items.splice(index, 1)
  }
  return picked
}
