export interface LessonIntroWord {
  id: string
  word: string
  ipa?: string
  meaning: string
  sentence: string
  sentenceCn: string
  imageAssetId?: string
}

const APPROVED_WORD_ART: Readonly<Record<string, string>> = {
  egg: 'egg-f4-v2.png',
  'egg-f4-v2': 'egg-f4-v2.png',
  'egg-f4-v2.png': 'egg-f4-v2.png',
}

/** 视觉层资产登记；没有批准资产时必须走无图版，禁止回退 emoji。 */
export function lessonIllustrationFilename(word: LessonIntroWord): string | null {
  const assetId = word.imageAssetId?.trim()
  return assetId ? APPROVED_WORD_ART[assetId] ?? null : null
}

export function lessonProgressPercent(done: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, (done / total) * 100))
}

export function repeatedWordUtterance(word: string): string {
  const clean = word.trim()
  return clean ? `${clean}. ${clean}.` : ''
}
