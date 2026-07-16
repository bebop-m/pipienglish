import { afterEach, describe, expect, it, vi } from 'vitest'
import { selectEnglishVoice, speak } from './tts'

function voice(lang: string, localService: boolean, name: string): SpeechSynthesisVoice {
  return { lang, localService, name, default: false, voiceURI: name } as SpeechSynthesisVoice
}

describe('TTS 英语声音选择', () => {
  afterEach(() => vi.unstubAllGlobals())

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

  it('提交前取消上一段语音,并使用儿童友好的 en-US 语速', () => {
    const localUs = voice('en-US', true, 'Local US')
    const synthesis = {
      cancel: vi.fn(),
      getVoices: vi.fn(() => [localUs]),
      speak: vi.fn(),
    }
    class FakeUtterance {
      voice: SpeechSynthesisVoice | null = null
      lang = ''
      rate = 1
      constructor(public text: string) {}
    }
    vi.stubGlobal('window', { speechSynthesis: synthesis })
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)

    expect(speak('apple')).toBe(true)
    expect(synthesis.cancel).toHaveBeenCalledOnce()
    const utterance = synthesis.speak.mock.calls[0][0] as FakeUtterance
    expect(utterance.text).toBe('apple')
    expect(utterance.voice).toBe(localUs)
    expect(utterance.lang).toBe('en-US')
    expect(utterance.rate).toBe(0.85)
  })

  it('设备语音实现抛错时仍然无声降级', () => {
    vi.stubGlobal('window', {
      speechSynthesis: {
        cancel: () => { throw new Error('unavailable') },
        getVoices: () => [],
        speak: () => undefined,
      },
    })
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(_text: string) {} })
    expect(speak('apple')).toBe(false)
  })
})
