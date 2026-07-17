// 起步词包(2026-07-17 爸爸指定):一次性把 12 个皮皮肯定认识的简单词放进"已学词库",
// 让她当晚完成必修后就有足够的池子玩默写小游戏。
// - 每词按 FSRS 记两次 Good:排程推后几天,不会把明天的复习队列挤爆
// - 记入 seen(陈旧度从今天算起);已学词自动排除出新词投放队列
// - kv 标记保证只执行一次;后续新设备安装同样生效(这是小皮的个人应用)

import type { PipiDB } from './db'
import { getKV, setKV } from './db'
import { newCard, rate } from '../domain/srs'
import { WORD_MAP } from '../domain/words'

export const STARTER_WORD_IDS: readonly string[] = [
  'apple', 'banana', 'orange', 'egg', 'milk', 'water',
  'cat', 'dog', 'fish', 'cake', 'candy', 'pizza',
]

const SEED_FLAG = 'starterWordsSeeded'

/** 幂等:已播种或某词已有学习记录则跳过该词;返回本次实际写入的词数 */
export async function ensureStarterWords(d: PipiDB, now = Date.now()): Promise<number> {
  const done = await getKV<number | null>(d, SEED_FLAG, null)
  if (done !== null) return 0

  let seeded = 0
  await d.transaction('rw', d.cards, d.seen, d.kv, async () => {
    for (const wordId of STARTER_WORD_IDS) {
      if (!WORD_MAP.has(wordId)) continue // 词库快照防线:ID 不存在就跳过
      if (await d.cards.get(wordId)) continue // 已有真实学习记录,不覆盖
      const card = rate(rate(newCard(), true), true)
      await d.cards.put({ wordId, due: card.due.getTime(), card })
      await d.seen.put({ wordId, lastSeenAt: now })
      seeded += 1
    }
    await setKV(d, SEED_FLAG, now)
  })
  return seeded
}
