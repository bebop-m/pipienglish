// 手动 JSON 是唯一备份渠道：v3 导出；导入兼容 v1/v2/v3。

import type { DailySession } from '../domain/types'
import type { CardRow, InkRow, KV, PipiDB, RescueRow, SeenRow } from './db'
import { convertToV3Archive } from './farmMigration'
import type {
  DecorationRow,
  OwnedCosmeticRow,
  PersistedChick,
  SceneMemoryRow,
} from './farmPersistence'
import { dayKey } from '../domain/time'

interface SerializedBlob {
  type: string
  base64: string
}

interface SerializedInkRow extends Omit<InkRow, 'png'> {
  png: SerializedBlob
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

async function serializeInk(rows: InkRow[]): Promise<SerializedInkRow[]> {
  return Promise.all(rows.map(async row => ({
    id: row.id,
    wordId: row.wordId,
    date: row.date,
    png: {
      type: row.png.type,
      base64: bytesToBase64(new Uint8Array(await row.png.arrayBuffer())),
    },
  })))
}

function reviveInk(rows: unknown[]): InkRow[] {
  return rows.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError(`ink[${index}] must be an object`)
    }
    const row = value as Partial<SerializedInkRow>
    if (typeof row.id !== 'string' || typeof row.wordId !== 'string' || typeof row.date !== 'string') {
      throw new TypeError(`ink[${index}] must have id, wordId and date`)
    }
    if (!row.png || typeof row.png.type !== 'string' || typeof row.png.base64 !== 'string') {
      throw new TypeError(`ink[${index}].png must be a serialized blob`)
    }
    return {
      id: row.id,
      wordId: row.wordId,
      date: row.date,
      png: new Blob([base64ToBytes(row.png.base64)], { type: row.png.type }),
    }
  })
}

export async function exportAll(d: PipiDB): Promise<string> {
  const now = Date.now()
  const [cards, sessions, kv, chicks, seen, rescue, ink, decorations, cosmetics, sceneMemory] = await d.transaction(
    'r',
    [d.cards, d.sessions, d.kv, d.chicks, d.seen, d.rescue, d.ink, d.decorations, d.cosmetics, d.sceneMemory],
    async () => Promise.all([
      d.cards.toArray(),
      d.sessions.toArray(),
      d.kv.toArray(),
      d.chicks.toArray(),
      d.seen.toArray(),
      d.rescue.toArray(),
      d.ink.toArray(),
      d.decorations.toArray(),
      d.cosmetics.toArray(),
      d.sceneMemory.toArray(),
    ]),
  )
  const converted = convertToV3Archive({
    version: 3,
    exportedAt: new Date(now).toISOString(),
    cards,
    sessions,
    kv,
    chicks,
    seen,
    rescue,
    ink: await serializeInk(ink),
    decorations,
    cosmetics,
    sceneMemory,
  }, { now, today: dayKey() })
  return JSON.stringify(converted)
}

export async function importAll(d: PipiDB, json: string): Promise<void> {
  const now = Date.now()
  const converted = convertToV3Archive(JSON.parse(json), { now, today: dayKey() })
  const ink = reviveInk(converted.ink)

  await d.transaction('rw', [
    d.cards,
    d.sessions,
    d.kv,
    d.chicks,
    d.seen,
    d.rescue,
    d.ink,
    d.decorations,
    d.cosmetics,
    d.sceneMemory,
  ], async () => {
    await Promise.all([
      d.cards.clear(),
      d.sessions.clear(),
      d.kv.clear(),
      d.chicks.clear(),
      d.seen.clear(),
      d.rescue.clear(),
      d.ink.clear(),
      d.decorations.clear(),
      d.cosmetics.clear(),
      d.sceneMemory.clear(),
    ])
    await Promise.all([
      d.cards.bulkPut(converted.cards as CardRow[]),
      d.sessions.bulkPut(converted.sessions as DailySession[]),
      d.kv.bulkPut(converted.kv as KV[]),
      d.chicks.bulkPut(converted.chicks as PersistedChick[]),
      d.seen.bulkPut(converted.seen as SeenRow[]),
      d.rescue.bulkPut(converted.rescue as RescueRow[]),
      d.ink.bulkPut(ink),
      d.decorations.bulkPut(converted.decorations as DecorationRow[]),
      d.cosmetics.bulkPut(converted.cosmetics as OwnedCosmeticRow[]),
      d.sceneMemory.bulkPut(converted.sceneMemory as SceneMemoryRow[]),
    ])
  })
}
