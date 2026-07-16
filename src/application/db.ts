// Dexie v2:持久化层与 v1 → v2 迁移
// 词库(words)保持打包进代码(架构方案 §6.1),DB 只存学习与农场状态

import Dexie, { type Table } from 'dexie'
import type { Card } from 'ts-fsrs'
import type { Chick, DailySession, FarmState, MetaState, Settings } from '../domain/types'
import { HATCHERY_SLOTS } from '../domain/types'
import { addDays, dayKey } from '../domain/time'

export interface CardRow {
  wordId: string
  due: number // 冗余索引,与 card.due 同步
  card: Card
}

export interface KV {
  key: string
  value: unknown
}

export interface SeenRow {
  wordId: string
  lastSeenAt: number
}

export interface RescueRow {
  wordId: string
  capturedAt: number
}

// 预留(v0.3):收尾默写字迹缩略图,现在建表免二次迁移
export interface InkRow {
  id: string
  wordId: string
  date: string
  png: Blob
}

/** v0.1 的 kv['farm'] 形状 */
export interface FarmV1 {
  henName: string
  chicks: number
  pendingEggs: { date: string; n: number }[]
}

export const DEFAULT_FARM: FarmState = { henName: null, eggStock: 0, incubating: [], cooking: 'empty' }
export const DEFAULT_SETTINGS: Settings = { motionEnabled: true }

export function defaultMeta(today = dayKey()): MetaState {
  return { streak: 0, lastDoneDate: null, totalDays: 0, installDate: today }
}

/**
 * v1 农场数据 → v2 变换(纯函数,可单测):
 * - 小鸡数字 → Chick 行(source='migration')
 * - 昨天以前下的蛋 → 直接孵化(旧模型本就次日自动孵化)
 * - 今天下的蛋 → 填孵化巢位(≤3),溢出记入 eggStock(获得新模型的选择权,零资产损失)
 */
export function migrateFarmV1(
  old: FarmV1 | undefined,
  installDate: string,
  today: string,
  now: number,
): { farmState: FarmState; chicks: Chick[] } {
  if (!old) return { farmState: { ...DEFAULT_FARM }, chicks: [] }
  const chicks: Chick[] = []
  let seq = 0
  const push = (bornOn: string) =>
    chicks.push({ chickId: `mig-${now}-${seq++}`, bornOn, source: 'migration', homeX: null, homeY: null })

  for (let i = 0; i < (old.chicks ?? 0); i++) push(installDate)

  let eggStock = 0
  const incubating: FarmState['incubating'] = []
  for (const egg of old.pendingEggs ?? []) {
    for (let i = 0; i < egg.n; i++) {
      if (egg.date < today) push(addDays(egg.date, 1))
      else if (incubating.length < HATCHERY_SLOTS) incubating.push({ slot: incubating.length as 0 | 1 | 2, placedAt: now })
      else eggStock += 1
    }
  }
  return { farmState: { henName: old.henName || null, eggStock, incubating, cooking: 'empty' }, chicks }
}

export class PipiDB extends Dexie {
  cards!: Table<CardRow, string>
  sessions!: Table<DailySession, string>
  kv!: Table<KV, string>
  chicks!: Table<Chick, string>
  seen!: Table<SeenRow, string>
  rescue!: Table<RescueRow, string>
  ink!: Table<InkRow, string>

  constructor(name = 'pipienglish') {
    super(name)
    this.version(1).stores({
      cards: 'wordId, due',
      sessions: 'date',
      kv: 'key',
    })
    this.version(2)
      .stores({
        cards: 'wordId, due',
        sessions: 'date',
        kv: 'key',
        chicks: 'chickId, bornOn',
        seen: 'wordId, lastSeenAt',
        rescue: 'wordId, capturedAt',
        ink: 'id, wordId, date',
      })
      .upgrade(async tx => {
        const now = Date.now()
        const today = dayKey()
        const farmRow = (await tx.table('kv').get('farm')) as KV | undefined
        const metaRow = (await tx.table('kv').get('meta')) as KV | undefined
        const oldMeta = (metaRow?.value ?? {}) as Partial<MetaState>
        const installDate = oldMeta.installDate ?? today

        const { farmState, chicks } = migrateFarmV1(farmRow?.value as FarmV1 | undefined, installDate, today, now)
        if (chicks.length) await tx.table('chicks').bulkAdd(chicks)
        await tx.table('kv').put({ key: 'farmState', value: farmState })
        await tx.table('kv').put({ key: 'settings', value: { ...DEFAULT_SETTINGS } })
        await tx.table('kv').put({ key: 'meta', value: { ...defaultMeta(today), ...oldMeta } })
        if (farmRow) await tx.table('kv').delete('farm')

        // seen 以已有复习记录初始化;从未复习的词首次见面时再建行
        const cards = (await tx.table('cards').toArray()) as CardRow[]
        const seenRows = cards
          .filter(c => c.card?.last_review)
          .map(c => ({ wordId: c.wordId, lastSeenAt: new Date(c.card.last_review as unknown as string | Date).getTime() }))
        if (seenRows.length) await tx.table('seen').bulkPut(seenRows)
      })
  }
}

export const db = new PipiDB()

export async function getKV<T>(d: PipiDB, key: string, fallback: T): Promise<T> {
  const row = await d.kv.get(key)
  return row ? (row.value as T) : fallback
}

export async function setKV(d: PipiDB, key: string, value: unknown): Promise<void> {
  await d.kv.put({ key, value })
}
