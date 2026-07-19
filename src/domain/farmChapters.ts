export interface ChapterDefinitionLike {
  chapter: number
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer`)
}

/** 第 36/72/108…个完成日分别获得第 2/3/4…章资格。 */
export function eligibleChapter(totalDays: number): number {
  assertNonNegativeInteger(totalDays, 'totalDays')
  return 1 + Math.floor(totalDays / 36)
}

/**
 * 返回从第 1 章开始连续打包的最大章节。缺章后的更高定义不构成可旅行内容，
 * 避免儿童端出现空白节点。
 */
export function availableChapter(definitions: readonly ChapterDefinitionLike[]): number {
  const chapters = new Set(definitions.map(definition => definition.chapter))
  let available = 0
  while (chapters.has(available + 1)) available += 1
  return available
}

export function enterableChapter(totalDays: number, packagedChapter: number): number {
  assertNonNegativeInteger(packagedChapter, 'packagedChapter')
  return Math.min(eligibleChapter(totalDays), packagedChapter)
}

/** 每次只能从当前旅程进入下一章；允许无限期停留。 */
export function nextTravelChapter(activeChapter: number, maxEnterableChapter: number): number | null {
  if (!Number.isInteger(activeChapter) || activeChapter < 1) {
    throw new RangeError('activeChapter must be a positive integer')
  }
  assertNonNegativeInteger(maxEnterableChapter, 'maxEnterableChapter')
  const next = activeChapter + 1
  return next <= maxEnterableChapter ? next : null
}

export function pendingTravelChapters(activeChapter: number, maxEnterableChapter: number): number[] {
  const first = nextTravelChapter(activeChapter, maxEnterableChapter)
  if (first === null) return []
  return Array.from({ length: maxEnterableChapter - first + 1 }, (_, index) => first + index)
}

/** 内容脱期时 acknowledged 也必须停在本地实际可进入的章节。 */
export function boundedAcknowledgedChapter(
  acknowledgedChapter: number,
  maxEnterableChapter: number,
): number {
  if (!Number.isInteger(acknowledgedChapter) || acknowledgedChapter < 1) {
    throw new RangeError('acknowledgedChapter must be a positive integer')
  }
  assertNonNegativeInteger(maxEnterableChapter, 'maxEnterableChapter')
  return Math.max(1, Math.min(acknowledgedChapter, maxEnterableChapter))
}

/** 庆祝严格按 acknowledged+1 补放；返回 null 表示儿童界面应保持安静。 */
export function nextCelebrationChapter(
  acknowledgedChapter: number,
  maxEnterableChapter: number,
): number | null {
  const bounded = boundedAcknowledgedChapter(acknowledgedChapter, maxEnterableChapter)
  const next = bounded + 1
  return next <= maxEnterableChapter ? next : null
}
