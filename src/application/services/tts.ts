// 发音服务(SPEC §7:speechSynthesis en-US,rate 0.85;后期可换真人音频只动本文件)
// 内核 createTtsService 依赖可注入(测试用);浏览器默认入口 speak() 在调用时解析全局。
//   speak(text) → boolean:播放成功提交返回 true;设备无 TTS 时无声降级,不阻塞交互

export function selectEnglishVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return (
    voices.find(v => v.lang.toLowerCase() === 'en-us' && v.localService) ??
    voices.find(v => v.lang.toLowerCase() === 'en-us') ??
    voices.find(v => v.lang.toLowerCase().startsWith('en')) ??
    null
  )
}

/** 服务依赖的最小面(真实实现 = window.speechSynthesis / SpeechSynthesisUtterance) */
export interface UtteranceLike {
  voice: SpeechSynthesisVoice | null
  lang: string
  rate: number
  volume: number
  onend?: (() => void) | null
}

export interface SynthesisLike {
  getVoices(): SpeechSynthesisVoice[]
  speak(utterance: UtteranceLike): void
  cancel(): void
  addEventListener?(type: 'voiceschanged', listener: () => void): void
}

export interface TtsService {
  speak(text: string): boolean
  cancel(): void
  isAvailable(): boolean
}

export interface TtsDeps {
  synthesis: SynthesisLike | null
  createUtterance: ((text: string) => UtteranceLike) | null
}

export function createTtsService({ synthesis, createUtterance }: TtsDeps): TtsService {
  let voice: SpeechSynthesisVoice | null = null

  // 声音列表可能延迟加载(iOS 首次为空):监听补选;每次播放前也懒选一次
  synthesis?.addEventListener?.('voiceschanged', () => {
    try {
      voice = selectEnglishVoice(synthesis.getVoices())
    } catch {
      voice = null
    }
  })

  return {
    speak(text: string): boolean {
      if (!text.trim() || !synthesis || !createUtterance) return false
      try {
        synthesis.cancel() // 连续点击/切卡:新播放永远打断旧播放
        const utter = createUtterance(text)
        if (!voice) voice = selectEnglishVoice(synthesis.getVoices())
        if (voice) utter.voice = voice
        utter.lang = 'en-US'
        utter.rate = 0.85
        utter.volume = 1
        synthesis.speak(utter)
        return true
      } catch {
        return false
      }
    },
    cancel(): void {
      try {
        synthesis?.cancel()
      } catch {
        // 无声降级
      }
    },
    isAvailable(): boolean {
      return Boolean(synthesis && createUtterance)
    },
  }
}

// —— 浏览器默认入口:调用时解析全局(能力可能在运行中出现/消失,测试也依赖此语义) ——

function currentBrowserDeps(): TtsDeps {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    typeof SpeechSynthesisUtterance === 'undefined'
  ) {
    return { synthesis: null, createUtterance: null }
  }
  return {
    synthesis: window.speechSynthesis as unknown as SynthesisLike,
    createUtterance: text => new SpeechSynthesisUtterance(text) as unknown as UtteranceLike,
  }
}

let defaultService: TtsService | null = null
let defaultSynthesis: SynthesisLike | null = null

/** 全局音频入口(useFarmHome / lesson 用例注入使用);synthesis 实例变化时重建内核 */
export function speak(text: string): boolean {
  const deps = currentBrowserDeps()
  if (!defaultService || defaultSynthesis !== deps.synthesis) {
    defaultService = createTtsService(deps)
    defaultSynthesis = deps.synthesis
  }
  return defaultService.speak(text)
}
