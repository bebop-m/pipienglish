export type LessonDictationState = 'ready' | 'correct' | 'retry' | 'captured'

/** 默写只比较输入法最终提交的英文文本，不区分键盘或系统手写输入来源。 */
export function normalizeDictationAnswer(value: string): string {
  return value.trim().normalize('NFC').toLocaleLowerCase('en-US')
}

export function judgeDictationAnswer(value: string, expected: string): 'correct' | 'retry' {
  return normalizeDictationAnswer(value) === normalizeDictationAnswer(expected) ? 'correct' : 'retry'
}

export function dictationInputForState(
  state: LessonDictationState,
  expected: string,
  retryPreview = 'hen',
): string {
  if (state === 'correct') return expected
  if (state === 'retry') return retryPreview
  return ''
}
