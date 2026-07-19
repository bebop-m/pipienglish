// 原创农场 BGM 合成器(无采样、无第三方素材,全部由本脚本算出波形)。
// 产物:无缝循环 WAV → ffmpeg 压成 MP3。三首候选风格不同,交给小皮挑。
//
//   node scripts/make-bgm.mjs [输出目录]
//
// 设计约束:
// - 无缝循环:总时长 = 整数个小节,尾部 crossfade 回开头,避免接缝爆音。
// - 不刺激:无打击乐、无强低频冲击、无突然音量跳变;整体做柔和低通。
// - 五声音阶为主(无半音摩擦),孩子长时间听不累。

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SAMPLE_RATE = 44100
const OUT_DIR = process.argv[2] ?? join(process.cwd(), 'scratch-bgm')

// —— 基础工具 ——

const noteHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12)

/** 音名 → MIDI 号,例 'C4' 'F#3' */
function midiOf(name) {
  const table = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const [, letter, accidental, octave] = name.match(/^([A-G])([#b]?)(-?\d)$/)
  const semitone = table[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0)
  return (Number(octave) + 1) * 12 + semitone
}

/** 指数衰减包络;attack 短则像拨弦/音乐盒,长则像风琴垫 */
function envelope(t, duration, { attack = 0.01, decay = 0.9, sustain = 0, release = 0.25 }) {
  if (t < 0 || t > duration + release) return 0
  if (t < attack) return t / attack
  const afterAttack = t - attack
  const decayLevel = sustain + (1 - sustain) * Math.exp(-afterAttack / decay)
  if (t <= duration) return decayLevel
  return decayLevel * Math.exp(-(t - duration) / (release / 3))
}

// —— 音色 ——

/** 音乐盒:基频 + 少量泛音,快起音长衰减 */
function musicBox(phase, harmonicMix = 1) {
  return (
    Math.sin(phase)
    + 0.34 * harmonicMix * Math.sin(phase * 2)
    + 0.14 * harmonicMix * Math.sin(phase * 3)
    + 0.05 * harmonicMix * Math.sin(phase * 4.2)
  ) / 1.53
}

/** 柔和风琴垫:轻微失谐叠加,产生缓慢的自然摇曳 */
function softPad(phase, detunePhase) {
  return (Math.sin(phase) + 0.7 * Math.sin(detunePhase) + 0.28 * Math.sin(phase * 2)) / 1.98
}

/** 三角波,近似木琴/电钢的圆润感 */
function triangle(phase) {
  const x = (phase / (2 * Math.PI)) % 1
  return 4 * Math.abs(x - 0.5) - 1
}

// —— 渲染 ——

function createBuffer(seconds) {
  return new Float32Array(Math.round(seconds * SAMPLE_RATE))
}

function addNote(buffer, { startSec, durationSec, midi, gain, timbre, pan = 0 }) {
  const start = Math.round(startSec * SAMPLE_RATE)
  const tail = 0.9
  const total = Math.round((durationSec + tail) * SAMPLE_RATE)
  const freq = noteHz(midi)
  const omega = (2 * Math.PI * freq) / SAMPLE_RATE
  const detune = (2 * Math.PI * freq * 1.0035) / SAMPLE_RATE
  for (let i = 0; i < total; i += 1) {
    const index = start + i
    if (index < 0 || index >= buffer.length) continue
    const t = i / SAMPLE_RATE
    const env = envelope(t, durationSec, timbre.env)
    if (env <= 0) continue
    const phase = omega * i
    const value = timbre.wave(phase, detune * i)
    // 轻微的呼吸感:极慢的振幅起伏
    const breath = 1 + 0.05 * Math.sin((2 * Math.PI * 0.12 * index) / SAMPLE_RATE)
    buffer[index] += value * env * gain * breath * (1 - Math.abs(pan) * 0.15)
  }
}

/** 一阶低通,削掉合成音的毛刺,让整体更「水粉」 */
function lowpass(buffer, cutoffHz) {
  const rc = 1 / (2 * Math.PI * cutoffHz)
  const dt = 1 / SAMPLE_RATE
  const alpha = dt / (rc + dt)
  let previous = 0
  for (let i = 0; i < buffer.length; i += 1) {
    previous += alpha * (buffer[i] - previous)
    buffer[i] = previous
  }
}

/** 尾部与开头交叉淡化,保证 loop 接缝听不出来 */
function makeSeamless(buffer, fadeSec) {
  const fade = Math.round(fadeSec * SAMPLE_RATE)
  const body = buffer.length - fade
  const out = buffer.slice(0, body)
  for (let i = 0; i < fade; i += 1) {
    const w = i / fade
    out[i] = out[i] * w + buffer[body + i] * (1 - w)
  }
  return out
}

function normalize(buffer, peak = 0.72) {
  let max = 0
  for (const sample of buffer) max = Math.max(max, Math.abs(sample))
  if (max === 0) return
  const scale = peak / max
  for (let i = 0; i < buffer.length; i += 1) buffer[i] *= scale
}

function writeWav(path, buffer) {
  const data = Buffer.alloc(buffer.length * 2)
  for (let i = 0; i < buffer.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, buffer[i]))
    data.writeInt16LE(Math.round(clamped * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  writeFileSync(path, Buffer.concat([header, data]))
}

// —— 音色预设 ——

const BOX = { wave: (p) => musicBox(p), env: { attack: 0.004, decay: 0.55, sustain: 0, release: 0.5 } }
const BELL = { wave: (p) => musicBox(p, 0.6), env: { attack: 0.006, decay: 1.1, sustain: 0, release: 0.9 } }
const PAD = { wave: (p, d) => softPad(p, d), env: { attack: 0.9, decay: 2.4, sustain: 0.55, release: 1.4 } }
const WOOD = { wave: (p) => triangle(p), env: { attack: 0.008, decay: 0.42, sustain: 0, release: 0.35 } }

// —— 三首候选 ——

/**
 * 1) 晴空农场:C 大调五声,音乐盒主旋律 + 长音垫。
 *    最「日常」的一首,适合天天听。
 */
function trackSunnyFarm() {
  const bpm = 72
  const beat = 60 / bpm
  const bars = 8
  const seconds = bars * 4 * beat + 2
  const buffer = createBuffer(seconds)

  const chords = [
    ['C3', 'E4', 'G4'], ['A2', 'C4', 'E4'],
    ['F2', 'A3', 'C4'], ['G2', 'B3', 'D4'],
    ['C3', 'E4', 'G4'], ['A2', 'C4', 'E4'],
    ['F2', 'A3', 'C4'], ['G2', 'D4', 'G4'],
  ]
  chords.forEach((chord, bar) => {
    chord.forEach((note, voice) => {
      addNote(buffer, {
        startSec: bar * 4 * beat,
        durationSec: 4 * beat,
        midi: midiOf(note),
        gain: voice === 0 ? 0.26 : 0.15,
        timbre: PAD,
      })
    })
  })

  // 五声音阶主旋律:每小节 4 拍,留白多
  const melody = [
    ['G4', 0, 1.5], ['E4', 1.5, 1], ['C5', 2.5, 1.5],
    ['A4', 4, 1.5], ['G4', 5.5, 1], ['E4', 6.5, 1.5],
    ['F4', 8, 1.5], ['A4', 9.5, 1], ['C5', 10.5, 1.5],
    ['D5', 12, 2], ['G4', 14, 2],
    ['E5', 16, 1.5], ['C5', 17.5, 1], ['G4', 18.5, 1.5],
    ['A4', 20, 1.5], ['C5', 21.5, 1], ['E5', 22.5, 1.5],
    ['D5', 24, 1.5], ['C5', 25.5, 1], ['A4', 26.5, 1.5],
    ['G4', 28, 2], ['C5', 30, 2],
  ]
  melody.forEach(([note, beatPos, lengthBeats]) => {
    addNote(buffer, {
      startSec: beatPos * beat,
      durationSec: lengthBeats * beat,
      midi: midiOf(note),
      gain: 0.4,
      timbre: BOX,
    })
  })

  lowpass(buffer, 5200)
  const looped = makeSeamless(buffer, 1.6)
  normalize(looped)
  return looped
}

/**
 * 2) 云朵散步:F 大调,更慢更空,几乎只有垫音与零星铃音。
 *    适合当「安静背景」,存在感最低。
 */
function trackCloudWalk() {
  const bpm = 58
  const beat = 60 / bpm
  const bars = 8
  const seconds = bars * 4 * beat + 3
  const buffer = createBuffer(seconds)

  const chords = [
    ['F2', 'A3', 'C4', 'F4'], ['D2', 'F3', 'A3', 'D4'],
    ['Bb2', 'D4', 'F4'], ['C3', 'E4', 'G4'],
    ['F2', 'A3', 'C4', 'F4'], ['D2', 'F3', 'A3', 'D4'],
    ['Bb2', 'D4', 'F4'], ['C3', 'G4', 'C5'],
  ]
  chords.forEach((chord, bar) => {
    chord.forEach((note, voice) => {
      addNote(buffer, {
        startSec: bar * 4 * beat,
        durationSec: 4.4 * beat,
        midi: midiOf(note),
        gain: voice === 0 ? 0.3 : 0.17,
        timbre: PAD,
      })
    })
  })

  const sparkles = [
    ['C5', 1], ['A4', 3.5], ['F5', 6],
    ['D5', 9], ['A4', 11.5], ['C5', 14],
    ['F5', 17], ['D5', 19.5], ['Bb4', 22],
    ['C5', 25], ['G4', 27.5], ['F5', 30],
  ]
  sparkles.forEach(([note, beatPos]) => {
    addNote(buffer, {
      startSec: beatPos * beat,
      durationSec: 2 * beat,
      midi: midiOf(note),
      gain: 0.3,
      timbre: BELL,
    })
  })

  lowpass(buffer, 4200)
  const looped = makeSeamless(buffer, 2.2)
  normalize(looped, 0.66)
  return looped
}

/**
 * 3) 小鸡散步:G 大调,轻快一点,木琴点缀有走路的跳跃感。
 *    最有精神的一首,但仍无鼓点。
 */
function trackChickStroll() {
  const bpm = 88
  const beat = 60 / bpm
  const bars = 8
  const seconds = bars * 4 * beat + 2
  const buffer = createBuffer(seconds)

  const chords = [
    ['G2', 'B3', 'D4'], ['E2', 'G3', 'B3'],
    ['C3', 'E4', 'G4'], ['D3', 'F#4', 'A4'],
    ['G2', 'B3', 'D4'], ['E2', 'G3', 'B3'],
    ['C3', 'E4', 'G4'], ['D3', 'A4', 'D5'],
  ]
  chords.forEach((chord, bar) => {
    chord.forEach((note, voice) => {
      addNote(buffer, {
        startSec: bar * 4 * beat,
        durationSec: 4 * beat,
        midi: midiOf(note),
        gain: voice === 0 ? 0.24 : 0.13,
        timbre: PAD,
      })
    })
  })

  // 木琴:两拍一个小跳,像小鸡一步一步走
  const steps = [
    ['D5', 0], ['B4', 0.75], ['G4', 1.5], ['B4', 2.25], ['D5', 3],
    ['E5', 4], ['B4', 4.75], ['G4', 5.5], ['B4', 6.25], ['E5', 7],
    ['G5', 8], ['E5', 8.75], ['C5', 9.5], ['E5', 10.25], ['G5', 11],
    ['F#5', 12], ['D5', 12.75], ['A4', 13.5], ['D5', 14.25],
    ['D5', 16], ['B4', 16.75], ['G4', 17.5], ['B4', 18.25], ['D5', 19],
    ['E5', 20], ['B4', 20.75], ['G4', 21.5], ['B4', 22.25], ['E5', 23],
    ['G5', 24], ['E5', 24.75], ['C5', 25.5], ['E5', 26.25], ['G5', 27],
    ['A5', 28], ['D5', 29], ['G4', 30],
  ]
  steps.forEach(([note, beatPos], index) => {
    addNote(buffer, {
      startSec: beatPos * beat,
      durationSec: 0.7 * beat,
      midi: midiOf(note),
      gain: index % 5 === 0 ? 0.36 : 0.26,
      timbre: WOOD,
    })
  })

  lowpass(buffer, 6000)
  const looped = makeSeamless(buffer, 1.4)
  normalize(looped, 0.7)
  return looped
}

// —— 主流程 ——

const TRACKS = [
  { id: 'sunny-farm', title: '晴空农场', render: trackSunnyFarm },
  { id: 'cloud-walk', title: '云朵散步', render: trackCloudWalk },
  { id: 'chick-stroll', title: '小鸡散步', render: trackChickStroll },
]

mkdirSync(OUT_DIR, { recursive: true })
for (const track of TRACKS) {
  const samples = track.render()
  const path = join(OUT_DIR, `bgm-${track.id}.wav`)
  writeWav(path, samples)
  console.log(`${track.title.padEnd(6)} ${track.id.padEnd(14)} ${(samples.length / SAMPLE_RATE).toFixed(1)}s  ${path}`)
}
