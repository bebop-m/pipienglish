// 备份导出/导入(SPEC §6 硬需求):v2 全表;导入兼容 v1 与 v2

import type { PipiDB, CardRow, FarmV1, KV } from './db'
import { migrateFarmV1, defaultMeta } from './db'
import { dayKey } from '../domain/time'
import type { MetaState } from '../domain/types'

export async function exportAll(d: PipiDB): Promise<string> {
  const [cards, sessions, kv, chicks, seen, rescue] = await Promise.all([
    d.cards.toArray(),
    d.sessions.toArray(),
    d.kv.toArray(),
    d.chicks.toArray(),
    d.seen.toArray(),
    d.rescue.toArray(),
  ])
  // ink(字迹 Blob)v0.3 引入后单独处理;当前表为空
  return JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), cards, sessions, kv, chicks, seen, rescue })
}

function reviveCards(cards: CardRow[]): CardRow[] {
  for (const row of cards) {
    row.card.due = new Date(row.card.due)
    if (row.card.last_review) row.card.last_review = new Date(row.card.last_review)
  }
  return cards
}

export async function importAll(d: PipiDB, json: string): Promise<void> {
  const data = JSON.parse(json)
  if (data.version !== 1 && data.version !== 2) throw new Error('未知的备份版本')

  await d.transaction('rw', [d.cards, d.sessions, d.kv, d.chicks, d.seen, d.rescue], async () => {
    await Promise.all([
      d.cards.clear(), d.sessions.clear(), d.kv.clear(),
      d.chicks.clear(), d.seen.clear(), d.rescue.clear(),
    ])
    await d.cards.bulkPut(reviveCards(data.cards ?? []))
    await d.sessions.bulkPut(data.sessions ?? [])

    if (data.version === 2) {
      await d.kv.bulkPut(data.kv ?? [])
      await d.chicks.bulkPut(data.chicks ?? [])
      await d.seen.bulkPut(data.seen ?? [])
      await d.rescue.bulkPut(data.rescue ?? [])
      return
    }

    // v1 备份:套用与 DB 升级相同的变换
    const now = Date.now()
    const today = dayKey()
    const kvRows = (data.kv ?? []) as KV[]
    const oldFarm = kvRows.find(r => r.key === 'farm')?.value as FarmV1 | undefined
    const oldMeta = (kvRows.find(r => r.key === 'meta')?.value ?? {}) as Partial<MetaState>
    const { farmState, chicks } = migrateFarmV1(oldFarm, oldMeta.installDate ?? today, today, now)
    await d.kv.bulkPut(kvRows.filter(r => r.key !== 'farm'))
    await d.kv.put({ key: 'farmState', value: farmState })
    await d.kv.put({ key: 'meta', value: { ...defaultMeta(today), ...oldMeta } })
    if (chicks.length) await d.chicks.bulkAdd(chicks)
    const seenRows = reviveCards(data.cards ?? [])
      .filter(c => c.card.last_review)
      .map(c => ({ wordId: c.wordId, lastSeenAt: (c.card.last_review as Date).getTime() }))
    if (seenRows.length) await d.seen.bulkPut(seenRows)
  })
}
