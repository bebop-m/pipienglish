import { describe, expect, it } from 'vitest'
import { selectEnglishVoice, speak } from './tts'

function voice(lang: string, localService: boolean, name: string): SpeechSynthesisVoice {
  return { lang, localService, name, default: false, voiceURI: name } as SpeechSynthesisVoice
}

describe('TTS 英语声音选择', () => {
  it('优先本地 en-US,其次远程 en-US,最后其他英语声音', () => {
    const enGb = voice('en-GB', true, 'British')
    const remoteUs = voice('en-US', false, 'Remote US')
    const localUs = voice('en-US', true, 'Local US')
    expect(selectEnglishVoice([enGb, remoteUs, localUs])).toBe(localUs)
    expect(selectEnglishVoice([enGb, remoteUs])).toBe(remoteUs)
    expect(selectEnglishVoice([enGb])).toBe(enGb)
  })

  it('语言标签大小写不影响选择,没有英语声音时返回 null', () => {
    const mixedCase = voice('EN-us', true, 'Mixed Case')
    expect(selectEnglishVoice([mixedCase])).toBe(mixedCase)
    expect(selectEnglishVoice([voice('zh-CN', true, 'Chinese')])).toBeNull()
  })

  it('无浏览器语音能力时无声降级且不抛错', () => {
    expect(speak('apple')).toBe(false)
    expect(speak('')).toBe(false)
  })
})
