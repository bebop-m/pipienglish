import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTtsService, selectEnglishVoice, speak, type SynthesisLike, type UtteranceLike } from './tts'

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

// —— 内核级测试(createTtsService 注入依赖) ——

class FakeUtterance implements UtteranceLike {
  voice: SpeechSynthesisVoice | null = null
  lang = ''
  rate = 0
  onend: (() => void) | null = null
  constructor(public text: string) {}
}

class FakeSynthesis implements SynthesisLike {
  voices: SpeechSynthesisVoice[] = []
  spoken: FakeUtterance[] = []
  cancelCount = 0
  private listener: (() => void) | null = null

  getVoices() {
    return this.voices
  }
  speak(u: UtteranceLike) {
    this.spoken.push(u as FakeUtterance)
  }
  cancel() {
    this.cancelCount += 1
  }
  addEventListener(_type: 'voiceschanged', listener: () => void) {
    this.listener = listener
  }
  /** 模拟系统声音列表迟到(iOS 首次 getVoices 为空) */
  loadVoices(voices: SpeechSynthesisVoice[]) {
    this.voices = voices
    this.listener?.()
  }
}

function setup() {
  const synth = new FakeSynthesis()
  const service = createTtsService({ synthesis: synth, createUtterance: text => new FakeUtterance(text) })
  return { synth, service }
}

describe('声音加载延迟', () => {
  it('列表为空时先无音色发声(系统默认),voiceschanged 后自动补选', () => {
    const { synth, service } = setup()
    expect(service.speak('apple')).toBe(true)
    expect(synth.spoken[0].voice).toBeNull() // 不因音色未加载而阻塞发声
    expect(synth.spoken[0].lang).toBe('en-US')

    const localUs = voice('en-US', true, 'Local US')
    synth.loadVoices([voice('zh-CN', true, 'Chinese'), localUs])
    service.speak('banana')
    expect(synth.spoken[1].voice).toBe(localUs)
  })

  it('实现不支持 voiceschanged 事件:播放时懒选音色', () => {
    const synth = new FakeSynthesis()
    synth.addEventListener = undefined as unknown as FakeSynthesis['addEventListener']
    const service = createTtsService({ synthesis: synth, createUtterance: text => new FakeUtterance(text) })
    const localUs = voice('en-US', true, 'Local US')
    synth.voices = [localUs]
    service.speak('apple')
    expect(synth.spoken[0].voice).toBe(localUs)
  })
})

describe('连续播放取消与重复播放', () => {
  it('每次 speak 先 cancel:切卡/连点永远打断旧播放', () => {
    const { synth, service } = setup()
    service.speak('apple')
    service.speak('banana')
    expect(synth.cancelCount).toBe(2)
    expect(synth.spoken.map(u => u.text)).toEqual(['apple', 'banana'])
  })

  it('听看卡 ×2:onend 后自动重播一遍,共 2 次且第二遍不再续播', () => {
    const { synth, service } = setup()
    expect(service.speak('apple', 2)).toBe(true)
    expect(synth.spoken).toHaveLength(1)
    synth.spoken[0].onend?.()
    expect(synth.spoken.map(u => u.text)).toEqual(['apple', 'apple'])
    expect(synth.spoken[1].onend ?? null).toBeNull()
  })

  it('重播前被新播放打断:旧 onend 迟到也不插播旧词', () => {
    const { synth, service } = setup()
    service.speak('apple', 2)
    const first = synth.spoken[0]
    service.speak('banana')
    first.onend?.()
    expect(synth.spoken.map(u => u.text)).toEqual(['apple', 'banana'])
  })

  it('cancel() 同样使续播失效', () => {
    const { synth, service } = setup()
    service.speak('apple', 2)
    service.cancel()
    synth.spoken[0].onend?.()
    expect(synth.spoken).toHaveLength(1)
    expect(synth.cancelCount).toBe(2)
  })

  it('空白文本不提交播放;times 向下取整且至少 1', () => {
    const { synth, service } = setup()
    expect(service.speak('   ')).toBe(false)
    expect(synth.spoken).toHaveLength(0)
    service.speak('apple', 0)
    expect(synth.spoken).toHaveLength(1)
    expect(synth.spoken[0].onend ?? null).toBeNull()
  })
})
