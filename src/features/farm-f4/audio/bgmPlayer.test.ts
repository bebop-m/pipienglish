import { describe, expect, it, vi } from 'vitest'
import type { SpeechListener } from '../../../application/services/tts'
import {
  BGM_BASE_VOLUME,
  BGM_DUCK_VOLUME,
  createBgmPlayer,
  type AudioLike,
  type BgmDeps,
} from './bgmPlayer'
import type { BgmTrackDefinition } from './bgmTracks'

const approved: BgmTrackDefinition = {
  id: 'approved',
  assetFilename: 'farm-loop.mp3',
  title: '晴空农场',
  assetStatus: 'approved',
}

class FakeAudio implements AudioLike {
  loop = false
  volume = 1
  playCount = 0
  pauseCount = 0
  rejectPlay = false
  constructor(public src: string) {}
  play() {
    this.playCount += 1
    return this.rejectPlay ? Promise.reject(new Error('autoplay blocked')) : Promise.resolve()
  }
  pause() {
    this.pauseCount += 1
  }
}

function setup(overrides: Partial<BgmDeps> = {}) {
  const created: FakeAudio[] = []
  let listener: SpeechListener | null = null
  let gestureRetry: (() => void) | null = null
  const timers = new Map<number, () => void>()
  let nextTimer = 1

  const player = createBgmPlayer({
    resolveTrack: () => approved,
    createAudio: src => {
      const audio = new FakeAudio(src)
      created.push(audio)
      return audio
    },
    trackUrl: filename => `/assets/f4/audio/${filename}`,
    onSpeechListener: next => { listener = next },
    awaitGesture: retry => {
      gestureRetry = retry
      return () => { gestureRetry = null }
    },
    setTimer: fn => {
      const id = nextTimer++
      timers.set(id, fn)
      return id
    },
    clearTimer: id => { timers.delete(id) },
    ...overrides,
  })

  return {
    player,
    created,
    speech: () => listener,
    gestureArmed: () => gestureRetry !== null,
    fireGesture: () => gestureRetry?.(),
    runTimers: () => { for (const fn of [...timers.values()]) fn() },
  }
}

describe('farm background music player', () => {
  it('stays completely silent while no track is approved', () => {
    const { player, created, speech } = setup({ resolveTrack: () => null })
    player.setActive(true)
    expect(created).toHaveLength(0)
    expect(speech()).toBeNull()
    expect(player.currentVolume()).toBeNull()
  })

  it('loops the approved track at the calm base volume', () => {
    const { player, created } = setup()
    player.setActive(true)
    expect(created).toHaveLength(1)
    expect(created[0].src).toBe('/assets/f4/audio/farm-loop.mp3')
    expect(created[0].loop).toBe(true)
    expect(created[0].playCount).toBe(1)
    expect(player.currentVolume()).toBe(BGM_BASE_VOLUME)
  })

  it('ducks under speech and restores afterwards', () => {
    const { player, speech } = setup()
    player.setActive(true)
    speech()!.onStart()
    expect(player.currentVolume()).toBe(BGM_DUCK_VOLUME)
    speech()!.onEnd()
    expect(player.currentVolume()).toBe(BGM_BASE_VOLUME)
  })

  it('restores volume from the safety timer when a platform never reports speech end', () => {
    const { player, speech, runTimers } = setup()
    player.setActive(true)
    speech()!.onStart()
    expect(player.currentVolume()).toBe(BGM_DUCK_VOLUME)
    runTimers()
    expect(player.currentVolume()).toBe(BGM_BASE_VOLUME)
  })

  it('waits for the first user gesture when iOS blocks autoplay', async () => {
    const blocked: FakeAudio[] = []
    const { player, gestureArmed, fireGesture } = setup({
      createAudio: src => {
        const audio = new FakeAudio(src)
        audio.rejectPlay = true
        blocked.push(audio)
        return audio
      },
    })

    player.setActive(true)
    expect(blocked[0].playCount).toBe(1)
    // play() 的拒绝在微任务里回调,等它挂上一次性手势监听
    await vi.waitFor(() => expect(gestureArmed()).toBe(true))

    blocked[0].rejectPlay = false
    fireGesture() // 皮皮第一次点农场
    expect(blocked[0].playCount).toBe(2)
  })

  it('pauses and detaches the speech listener when leaving the farm screen', () => {
    const { player, created, speech } = setup()
    player.setActive(true)
    player.setActive(false)
    expect(created[0].pauseCount).toBe(1)
    expect(speech()).toBeNull()

    player.setActive(true)
    expect(created).toHaveLength(1) // 续播同一实例,不重建
    expect(created[0].playCount).toBe(2)
  })
})
