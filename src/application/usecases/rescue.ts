import type { PipiDB, RescueRow } from '../db'
import type { LessonOptionVM, LessonWordVM } from '../lessonViewModel'
import { buildOptions, mulberry32, seedOf } from '../../domain/lesson'
import {
  RESCUE_STAGES,
  nextRescueStage,
  normalizeRescueAnswer,
  normalizeRescueStage,
  rescueStageIndex,
  type RescueStage,
} from '../../domain/rescue'
import { WORD_MAP, WORDS } from '../../domain/words'

export interface RescueViewModel {
  hydrated: true
  empty: boolean
  queueTotal: number
  stage: RescueStage
  stageIndex: number
  stageTotal: 4
  word: LessonWordVM | null
  options: LessonOptionVM[]
  correctOptionId: string | null
}

function rowOrder(a: RescueRow, b: RescueRow): number {
  return a.capturedAt - b.capturedAt || a.wordId.localeCompare(b.wordId)
}

function toWordVM(wordId: string): LessonWordVM | null {
  const word = WORD_MAP.get(wordId)
  if (!word) return null
  return {
    id: word.id,
    word: word.word,
    ipa: word.ipa,
    meaning: word.meaning,
    sentence: word.sentence,
    sentenceCn: word.sentenceCn,
    emoji: word.emoji,
    imageAssetId: word.imageAssetId,
  }
}

export function createRescueUsecases(d: PipiDB) {
  async function queue(): Promise<RescueRow[]> {
    return (await d.rescue.toArray()).sort(rowOrder)
  }

  async function currentRow(): Promise<RescueRow | null> {
    return (await queue())[0] ?? null
  }

  async function loadViewModel(): Promise<RescueViewModel> {
    const rows = await queue()
    const row = rows[0]
    const stage = normalizeRescueStage(row?.stage)
    const word = row ? toWordVM(row.wordId) : null
    if (!row || !word) {
      return {
        hydrated: true,
        empty: true,
        queueTotal: rows.length,
        stage: 'intro',
        stageIndex: 1,
        stageTotal: 4,
        word: null,
        options: [],
        correctOptionId: null,
      }
    }

    const labels = buildOptions(WORD_MAP.get(row.wordId)!, WORDS, mulberry32(seedOf(`rescue:${row.wordId}:${row.capturedAt}`)))
    const options = labels.map((label, index) => ({ id: `opt-${index}`, label }))
    const correctIndex = labels.indexOf(word.meaning)
    return {
      hydrated: true,
      empty: false,
      queueTotal: rows.length,
      stage,
      stageIndex: rescueStageIndex(stage),
      stageTotal: RESCUE_STAGES.length,
      word,
      options,
      correctOptionId: correctIndex < 0 ? null : `opt-${correctIndex}`,
    }
  }

  async function completePassiveStep(expectedStage: 'intro' | 'trace'): Promise<boolean> {
    return d.transaction('rw', d.rescue, async () => {
      const row = await currentRow()
      if (!row || normalizeRescueStage(row.stage) !== expectedStage) return false
      const next = nextRescueStage(expectedStage)
      if (!next) return false
      await d.rescue.update(row.wordId, { stage: next })
      return true
    })
  }

  async function submitChoice(selectedId: string): Promise<boolean> {
    const vm = await loadViewModel()
    if (vm.empty || vm.stage !== 'choice' || selectedId !== vm.correctOptionId || !vm.word) return false
    return d.transaction('rw', d.rescue, async () => {
      const row = await currentRow()
      if (!row || row.wordId !== vm.word!.id || normalizeRescueStage(row.stage) !== 'choice') return false
      await d.rescue.update(row.wordId, { stage: 'dictation' })
      return true
    })
  }

  async function submitDictation(value: string): Promise<boolean> {
    const row = await currentRow()
    if (!row || normalizeRescueStage(row.stage) !== 'dictation') return false
    const word = WORD_MAP.get(row.wordId)
    return Boolean(word && normalizeRescueAnswer(value) === normalizeRescueAnswer(word.word))
  }

  async function confirmDictation(value: string, now = Date.now()): Promise<boolean> {
    if (!await submitDictation(value)) return false
    const row = await currentRow()
    if (!row) return false

    return d.transaction('rw', d.rescue, d.seen, async () => {
      const latest = await currentRow()
      if (!latest || latest.wordId !== row.wordId || normalizeRescueStage(latest.stage) !== 'dictation') return false
      await d.rescue.delete(row.wordId)
      await d.seen.put({ wordId: row.wordId, lastSeenAt: now })
      return true
    })
  }

  return { loadViewModel, completePassiveStep, submitChoice, submitDictation, confirmDictation }
}

export type RescueUsecases = ReturnType<typeof createRescueUsecases>
