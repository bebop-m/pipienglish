// 发音服务(SPEC §7:speechSynthesis en-US,rate 0.85;后期可换真人音频只动本文件)
// 内核 createTtsService 依赖可注入(测试用);浏览器默认入口 speak() 在调用时解析全局。
//   speak(text, times?) → boolean:播放成功提交返回 true;设备无 TTS 时无声降级,不阻塞交互
//   times=2 供听看卡"发音自动播 2 遍"(SPEC §2.2 ①);中途有新播放/取消则不再重复

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
  onend?: (() => void) | null
}

export interface SynthesisLike {
  getVoices(): SpeechSynthesisVoice[]
  speak(utterance: UtteranceLike): void
  cancel(): void
  addEventListener?(type: 'voiceschanged', listener: () => void): void
}

export interface TtsService {
  speak(text: string, times?: number): boolean
  cancel(): void
  isAvailable(): boolean
}

export interface TtsDeps {
  synthesis: SynthesisLike | null
  createUtterance: ((text: string) => UtteranceLike) | null
}

export function createTtsService({ synthesis, createUtterance }: TtsDeps): TtsService {
  let voice: SpeechSynthesisVoice | null = null
  let generation = 0 // 每次新播放/取消 +1;旧 utterance 迟到的 onend 续播据此失效

  // 声音列表可能延迟加载(iOS 首次为空):监听补选;每次播放前也懒选一次
  synthesis?.addEventListener?.('voiceschanged', () => {
    try {
      voice = selectEnglishVoice(synthesis.getVoices())
    } catch {
      voice = null
    }
  })

  function speakOnce(text: string, remaining: number, gen: number): boolean {
    if (!synthesis || !createUtterance) return false
    try {
      const utter = createUtterance(text)
      if (!voice) voice = selectEnglishVoice(synthesis.getVoices())
      if (voice) utter.voice = voice
      utter.lang = 'en-US'
      utter.rate = 0.85
      if (remaining > 1) {
        utter.onend = () => {
          if (gen === generation) speakOnce(text, remaining - 1, gen)
        }
      }
      synthesis.speak(utter)
      return true
    } catch {
      return false
    }
  }

  return {
    speak(text: string, times = 1): boolean {
      if (!text.trim() || !synthesis || !createUtterance) return false
      generation += 1
      try {
        synthesis.cancel() // 连续点击/切卡:新播放永远打断旧播放
      } catch {
        return false
      }
      return speakOnce(text, Math.max(1, Math.floor(times)), generation)
    },
    cancel(): void {
      generation += 1
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
export function speak(text: string, times = 1): boolean {
  const deps = currentBrowserDeps()
  if (!defaultService || defaultSynthesis !== deps.synthesis) {
    defaultService = createTtsService(deps)
    defaultSynthesis = deps.synthesis
  }
  return defaultService.speak(text, times)
}
