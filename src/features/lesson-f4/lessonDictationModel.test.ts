import { describe, expect, it } from 'vitest'
import {
  dictationInputForState,
  judgeDictationAnswer,
  normalizeDictationAnswer,
} from './lessonDictationModel'

describe('lesson dictation model', () => {
  it('normalizes only outer whitespace, Unicode, and English case', () => {
    expect(normalizeDictationAnswer('  EGG  ')).toBe('egg')
    expect(normalizeDictationAnswer('ice  cream')).toBe('ice  cream')
  })

  it('judges the final text produced by keyboard or system handwriting input', () => {
    expect(judgeDictationAnswer(' Egg ', 'egg')).toBe('correct')
    expect(judgeDictationAnswer('hen', 'egg')).toBe('retry')
    expect(judgeDictationAnswer('', 'egg')).toBe('retry')
  })

  it('never places the expected answer into ready, retry, or captured preview input', () => {
    expect(dictationInputForState('ready', 'egg')).toBe('')
    expect(dictationInputForState('retry', 'egg')).toBe('hen')
    expect(dictationInputForState('captured', 'egg')).toBe('')
    expect(dictationInputForState('correct', 'egg')).toBe('egg')
  })
})
