// 农场背景音乐播放器。与 tts.ts 同构:可注入内核 createBgmPlayer + 浏览器默认实例。
// 约束:
// - iOS/Safari 禁止无手势自动播放:play() 被拒后挂一次性 pointerdown 重试,
//   皮皮第一次点击农场任何位置时音乐自然开始,不弹任何提示。
// - TTS(点小鸡说单词、跟读)播放期间自动闪避降音量,结束后恢复;
//   cancel 不可靠触发 onend 的平台用安全计时器兜底恢复。
// - setActive(false)(离开农场页/关闭开关)暂停但不销毁,回来续播。

import { setSpeechListener, type SpeechListener } from '../../../application/services/tts'
import { f4AssetUrl } from '../assetUrl'
import { approvedBgmTrack, type BgmTrackDefinition } from './bgmTracks'

export const BGM_BASE_VOLUME = 0.32
export const BGM_DUCK_VOLUME = 0.08
export const DUCK_SAFETY_MS = 12_000

/** 播放器依赖的最小面(真实实现 = HTMLAudioElement) */
export interface AudioLike {
  loop: boolean
  volume: number
  play(): Promise<void>
  pause(): void
}

export interface BgmDeps {
  resolveTrack: () => BgmTrackDefinition | null
  createAudio: (src: string) => AudioLike
  trackUrl?: (filename: string) => string
  onSpeechListener?: (listener: SpeechListener | null) => void
  /** 自动播放被拒后等待的一次性用户手势;返回取消函数 */
  awaitGesture?: (retry: () => void) => () => void
  setTimer?: (fn: () => void, ms: number) => number
  clearTimer?: (id: number) => void
}

export interface BgmPlayer {
  setActive(active: boolean): void
  /** 供测试断言;生产不使用 */
  currentVolume(): number | null
}

export function createBgmPlayer(deps: BgmDeps): BgmPlayer {
  const {
    resolveTrack,
    createAudio,
    trackUrl = filename => f4AssetUrl(`audio/${filename}`),
    onSpeechListener = setSpeechListener,
    awaitGesture,
    setTimer = (fn, ms) => (typeof window === 'undefined' ? 0 : window.setTimeout(fn, ms)),
    clearTimer = id => { if (typeof window !== 'undefined') window.clearTimeout(id) },
  } = deps

  let audio: AudioLike | null = null
  let audioSrc: string | null = null
  let active = false
  let ducked = false
  let cancelGesture: (() => void) | null = null
  let duckSafetyTimer = 0

  function applyVolume(): void {
    if (audio) audio.volume = ducked ? BGM_DUCK_VOLUME : BGM_BASE_VOLUME
  }

  function armGestureRetry(): void {
    if (cancelGesture || !awaitGesture) return
    cancelGesture = awaitGesture(() => {
      cancelGesture = null
      tryPlay()
    })
  }

  function tryPlay(): void {
    if (!audio || !active) return
    audio.play().catch(() => armGestureRetry())
  }

  function speechStarted(): void {
    ducked = true
    applyVolume()
    clearTimer(duckSafetyTimer)
    duckSafetyTimer = setTimer(speechEnded, DUCK_SAFETY_MS)
  }

  function speechEnded(): void {
    ducked = false
    clearTimer(duckSafetyTimer)
    applyVolume()
  }

  return {
    setActive(nextActive: boolean): void {
      const track = resolveTrack()
      active = nextActive && track !== null
      if (!active) {
        audio?.pause()
        cancelGesture?.()
        cancelGesture = null
        onSpeechListener(null)
        return
      }
      if (!track) return
      const src = trackUrl(track.assetFilename)
      if (!audio || audioSrc !== src) {
        audio?.pause()
        audio = createAudio(src)
        audio.loop = true
        audioSrc = src
      }
      applyVolume()
      onSpeechListener({ onStart: speechStarted, onEnd: speechEnded })
      tryPlay()
    },
    currentVolume(): number | null {
      return audio ? audio.volume : null
    },
  }
}

// —— 浏览器默认实例 ——

let defaultPlayer: BgmPlayer | null = null

export function setBgmActive(active: boolean): void {
  if (typeof window === 'undefined') return
  defaultPlayer ??= createBgmPlayer({
    resolveTrack: () => approvedBgmTrack(),
    createAudio: src => new Audio(src),
    awaitGesture: retry => {
      window.addEventListener('pointerdown', retry, { once: true, capture: true })
      return () => window.removeEventListener('pointerdown', retry, { capture: true })
    },
  })
  defaultPlayer.setActive(active)
}
