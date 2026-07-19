// 原创农场 BGM 合成器(无采样、无第三方素材,全部由本脚本算出波形)。
// 产物:无缝循环 WAV → ffmpeg 压成 MP3。
//
//   node scripts/make-bgm.mjs [输出目录]
//
// 风格目标(2026-07-19 小皮/爸爸指定):《动物森友会》那种氛围。其音乐特征是
// 爵士和声而非童谣三和弦——
//   1. 扩展和弦:maj9 / m9 / 13 / m7b5,以及 ii-V-I 走向与半音经过和弦;
//   2. bossa nova 律动:轻摇摆的切分,旋律少落在正拍上;
//   3. 音色:Rhodes 电钢、马林巴、颤音琴,而非music box;
//   4. bossa 贝斯(根音 + 五度两拍感)与极轻的沙锤;
//   5. 俏皮的旋律跳进和短动机重复。
//
// 儿童向约束保留:无强打击、无低频冲击、无突然音量跳变、整体柔和低通。

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SAMPLE_RATE = 44100
const OUT_DIR = process.argv[2] ?? join(process.cwd(), 'scratch-bgm')

// —— 音高 ——

const noteHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12)

function midiOf(name) {
  const table = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const [, letter, accidental, octave] = name.match(/^([A-G])([#b]?)(-?\d)$/)
  const semitone = table[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0)
  return (Number(octave) + 1) * 12 + semitone
}

/** 轻摇摆:后半拍推后一点点,产生 bossa/爵士的懒散感(0=平直,0.167=三连音摇摆) */
function swung(beatPos, swing = 0.07) {
  const bar = Math.floor(beatPos)
  const frac = beatPos - bar
  if (Math.abs(frac - 0.5) < 1e-6) return bar + 0.5 + swing
  return beatPos
}

// —— 包络 ——

function envelope(t, duration, { attack = 0.01, decay = 0.9, sustain = 0, release = 0.25 }) {
  if (t < 0 || t > duration + release) return 0
  if (t < attack) return t / attack
  const level = sustain + (1 - sustain) * Math.exp(-(t - attack) / decay)
  if (t <= duration) return level
  return level * Math.exp(-(t - duration) / (release / 3))
}

// —— 音色(t 参与运算,可做随时间变化的泛音) ——

/** Rhodes 电钢:正弦基频 + 起音瞬间的钟声泛音 + 缓慢颤音 */
const RHODES = {
  wave: (p, _d, t) => {
    const bell = Math.exp(-t * 26)
    const tremolo = 1 + 0.07 * Math.sin(2 * Math.PI * 4.6 * t)
    return (Math.sin(p) + 0.22 * Math.sin(p * 2) + 0.5 * bell * Math.sin(p * 7.1)) / 1.5 * tremolo
  },
  env: { attack: 0.005, decay: 0.9, sustain: 0.08, release: 0.5 },
}

/** 马林巴:强四次泛音(木质空腔),衰减快 */
const MARIMBA = {
  wave: (p, _d, t) => {
    const knock = Math.exp(-t * 40)
    return (Math.sin(p) + 0.46 * Math.sin(p * 4) + 0.13 * Math.sin(p * 9.2) + 0.3 * knock * Math.sin(p * 14)) / 1.7
  },
  env: { attack: 0.003, decay: 0.34, sustain: 0, release: 0.3 },
}

/** 颤音琴:长延音 + 明显颤音,适合慢曲 */
const VIBES = {
  wave: (p, _d, t) => {
    const tremolo = 1 + 0.16 * Math.sin(2 * Math.PI * 3.2 * t)
    return (Math.sin(p) + 0.3 * Math.sin(p * 4) + 0.08 * Math.sin(p * 8)) / 1.38 * tremolo
  },
  env: { attack: 0.006, decay: 1.5, sustain: 0.05, release: 1.1 },
}

/** 柔和贝斯:三角波偏圆,不做低频冲击 */
const BASS = {
  wave: (p) => {
    const x = (p / (2 * Math.PI)) % 1
    const tri = 4 * Math.abs(x - 0.5) - 1
    return tri * 0.82 + 0.18 * Math.sin(p)
  },
  env: { attack: 0.012, decay: 0.5, sustain: 0.12, release: 0.3 },
}

/** 和声垫:极轻,只负责把和弦黏起来 */
const PAD = {
  wave: (p, d) => (Math.sin(p) + 0.62 * Math.sin(d) + 0.2 * Math.sin(p * 2)) / 1.82,
  env: { attack: 0.6, decay: 2.6, sustain: 0.5, release: 1.2 },
}

// —— 渲染 ——

const createBuffer = (seconds) => new Float32Array(Math.round(seconds * SAMPLE_RATE))

function addNote(buffer, { startSec, durationSec, midi, gain, timbre }) {
  const start = Math.round(startSec * SAMPLE_RATE)
  const total = Math.round((durationSec + 1.4) * SAMPLE_RATE)
  const freq = noteHz(midi)
  const omega = (2 * Math.PI * freq) / SAMPLE_RATE
  const detune = (2 * Math.PI * freq * 1.0032) / SAMPLE_RATE
  for (let i = 0; i < total; i += 1) {
    const index = start + i
    if (index < 0 || index >= buffer.length) continue
    const t = i / SAMPLE_RATE
    const env = envelope(t, durationSec, timbre.env)
    if (env <= 0) continue
    buffer[index] += timbre.wave(omega * i, detune * i, t) * env * gain
  }
}

/** 沙锤:带通噪声的极短脉冲,音量很低,只提供律动的呼吸 */
function addShaker(buffer, startSec, gain) {
  const start = Math.round(startSec * SAMPLE_RATE)
  const total = Math.round(0.075 * SAMPLE_RATE)
  let previous = 0
  for (let i = 0; i < total; i += 1) {
    const index = start + i
    if (index < 0 || index >= buffer.length) continue
    const t = i / SAMPLE_RATE
    const noise = Math.random() * 2 - 1
    previous = previous * 0.55 + noise * 0.45 // 高频偏移,像沙沙声
    buffer[index] += (noise - previous) * Math.exp(-t * 65) * gain
  }
}

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

/** Schroeder 混响:4 梳状 + 2 全通。让合成音不那么干,接近"在房间里演奏" */
function reverb(buffer, { mix = 0.26, feedback = 0.76 } = {}) {
  const combDelays = [1557, 1617, 1691, 1781]
  const allpassDelays = [225, 556]
  const wet = new Float32Array(buffer.length)

  for (const delay of combDelays) {
    const line = new Float32Array(delay)
    let cursor = 0
    for (let i = 0; i < buffer.length; i += 1) {
      const delayed = line[cursor]
      wet[i] += delayed / combDelays.length
      line[cursor] = buffer[i] + delayed * feedback
      cursor = (cursor + 1) % delay
    }
  }
  for (const delay of allpassDelays) {
    const line = new Float32Array(delay)
    let cursor = 0
    for (let i = 0; i < wet.length; i += 1) {
      const delayed = line[cursor]
      const output = -wet[i] + delayed
      line[cursor] = wet[i] + delayed * 0.5
      wet[i] = output
      cursor = (cursor + 1) % delay
    }
  }
  for (let i = 0; i < buffer.length; i += 1) buffer[i] = buffer[i] * (1 - mix) + wet[i] * mix
}

/** 尾部与开头交叉淡化,保证 loop 接缝听不出来(混响尾也一并融入) */
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
  for (let i = 0; i < buffer.length; i += 1) buffer[i] *= peak / max
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

// —— 编曲助手 ——

/**
 * 铺一段爵士伴奏。chart 每项 = { bass, voicing, beats }
 * voicing 用无根音位(3/7/9/13),这是爵士键盘的标准做法,避免和低音打架。
 */
function layChart(buffer, chart, { beat, swing, rhodesGain = 0.2, bassGain = 0.3, padGain = 0.09 }) {
  let cursor = 0
  for (const bar of chart) {
    const barStart = cursor * beat
    // bossa 贝斯:根音在正拍,五度在第 2.5 拍
    addNote(buffer, { startSec: barStart, durationSec: beat * 1.4, midi: midiOf(bar.bass), gain: bassGain, timbre: BASS })
    addNote(buffer, {
      startSec: swung(cursor + 2.5, swing) * beat,
      durationSec: beat * 1.2,
      midi: midiOf(bar.bass) + 7,
      gain: bassGain * 0.82,
      timbre: BASS,
    })
    // Rhodes 和弦:切分落点,不踩正拍
    for (const hit of bar.hits ?? [0.5, 2, 3.5]) {
      bar.voicing.forEach((note, voice) => {
        addNote(buffer, {
          startSec: swung(cursor + hit, swing) * beat,
          durationSec: beat * 0.8,
          midi: midiOf(note),
          gain: rhodesGain * (voice === 0 ? 1 : 0.8),
          timbre: RHODES,
        })
      })
    }
    // 垫音把和弦黏住
    bar.voicing.forEach((note) => {
      addNote(buffer, { startSec: barStart, durationSec: beat * 4, midi: midiOf(note), gain: padGain, timbre: PAD })
    })
    cursor += bar.beats ?? 4
  }
  return cursor
}

function layShaker(buffer, totalBeats, beat, swing, gain = 0.05) {
  for (let b = 0; b < totalBeats; b += 0.5) {
    const accent = b % 1 === 0 ? 1 : 0.55
    addShaker(buffer, swung(b, swing) * beat, gain * accent)
  }
}

function layMelody(buffer, notes, { beat, swing, timbre, gain = 0.34 }) {
  for (const [note, beatPos, lengthBeats, accent = 1] of notes) {
    addNote(buffer, {
      startSec: swung(beatPos, swing) * beat,
      durationSec: lengthBeats * beat,
      midi: midiOf(note),
      gain: gain * accent,
      timbre,
    })
  }
}

// —— 三首候选 ——

/**
 * 1) 午后农场 — F 大调 I-vi-ii-V,Rhodes + 马林巴,最典型的动森午后感。
 */
function trackAfternoon() {
  const bpm = 94
  const beat = 60 / bpm
  const swing = 0.07
  const buffer = createBuffer(8 * 4 * beat + 3)

  // Fmaj9 → Dm9 → Gm9 → C13,第二轮把 Dm9 换成 Bm7b5-E7 增加爵士味
  const chart = [
    { bass: 'F2', voicing: ['A3', 'C4', 'E4', 'G4'] },
    { bass: 'D2', voicing: ['F3', 'A3', 'C4', 'E4'] },
    { bass: 'G2', voicing: ['Bb3', 'D4', 'F4', 'A4'] },
    { bass: 'C2', voicing: ['E3', 'Bb3', 'D4', 'A4'] },
    { bass: 'F2', voicing: ['A3', 'C4', 'E4', 'G4'] },
    { bass: 'B2', voicing: ['D3', 'F3', 'A3', 'D4'] },
    { bass: 'E2', voicing: ['G#3', 'D4', 'F4', 'B4'] },
    { bass: 'A2', voicing: ['C4', 'E4', 'G4', 'B4'] },
  ]
  const totalBeats = layChart(buffer, chart, { beat, swing })
  layShaker(buffer, totalBeats, beat, swing, 0.045)

  // 旋律:多起于后半拍,含 9 度与 6 度色彩音
  layMelody(buffer, [
    ['C5', 0.5, 0.5], ['D5', 1, 0.5], ['A4', 1.5, 1], ['G4', 3, 1, 0.85],
    ['F5', 4.5, 0.5], ['E5', 5, 0.5], ['C5', 5.5, 1.5], ['A4', 7, 0.5, 0.8],
    ['D5', 8.5, 0.5], ['F5', 9, 0.5], ['A5', 9.5, 1], ['G5', 11, 1, 0.85],
    ['E5', 12.5, 0.5], ['D5', 13, 0.5], ['Bb4', 13.5, 1.5], ['A4', 15, 0.5, 0.8],
    ['C5', 16.5, 0.5], ['D5', 17, 0.5], ['A4', 17.5, 1], ['G4', 19, 1, 0.85],
    ['D5', 20.5, 0.5], ['F5', 21, 0.5], ['A4', 21.5, 1.5], ['B4', 23, 0.5, 0.8],
    ['E5', 24.5, 0.5], ['D5', 25, 0.5], ['B4', 25.5, 1], ['G#4', 27, 1, 0.85],
    ['A4', 28.5, 0.5], ['C5', 29, 0.5], ['E5', 29.5, 1.5], ['A4', 31, 1, 0.8],
  ], { beat, swing, timbre: MARIMBA, gain: 0.36 })

  lowpass(buffer, 6400)
  reverb(buffer, { mix: 0.26 })
  const looped = makeSeamless(buffer, 1.7)
  normalize(looped, 0.72)
  return looped
}

/**
 * 2) 黄昏散步 — Bb 大调,慢速,颤音琴主奏,带 m7b5 的忧郁色彩。最安静的一首。
 */
function trackDusk() {
  const bpm = 74
  const beat = 60 / bpm
  const swing = 0.05
  const buffer = createBuffer(8 * 4 * beat + 4)

  const chart = [
    { bass: 'Bb2', voicing: ['D4', 'F4', 'A4', 'C5'], hits: [0.5, 2.5] },
    { bass: 'G2', voicing: ['Bb3', 'D4', 'F4', 'A4'], hits: [0.5, 2.5] },
    { bass: 'C2', voicing: ['Eb3', 'G3', 'Bb3', 'D4'], hits: [0.5, 2.5] },
    { bass: 'F2', voicing: ['A3', 'Eb4', 'G4', 'D5'], hits: [0.5, 2.5] },
    { bass: 'Bb2', voicing: ['D4', 'F4', 'A4', 'C5'], hits: [0.5, 2.5] },
    { bass: 'Eb2', voicing: ['G3', 'Bb3', 'D4', 'F4'], hits: [0.5, 2.5] },
    { bass: 'A2', voicing: ['C4', 'Eb4', 'G4'], hits: [0.5, 2.5] },
    { bass: 'D2', voicing: ['F#3', 'C4', 'E4', 'A4'], hits: [0.5, 2.5] },
  ]
  const totalBeats = layChart(buffer, chart, { beat, swing, rhodesGain: 0.16, bassGain: 0.26, padGain: 0.11 })
  layShaker(buffer, totalBeats, beat, swing, 0.022)

  layMelody(buffer, [
    ['F5', 1, 1.5], ['D5', 2.5, 1.5],
    ['Bb4', 5, 1], ['D5', 6, 2],
    ['G5', 9, 1.5], ['F5', 10.5, 1.5],
    ['Eb5', 13, 1], ['D5', 14, 2],
    ['F5', 17, 1.5], ['A5', 18.5, 1.5],
    ['G5', 21, 1], ['Bb5', 22, 2],
    ['Eb5', 25, 1.5], ['C5', 26.5, 1.5],
    ['A4', 29, 1], ['D5', 30, 2],
  ], { beat, swing, timbre: VIBES, gain: 0.3 })

  lowpass(buffer, 4800)
  reverb(buffer, { mix: 0.34, feedback: 0.79 })
  const looped = makeSeamless(buffer, 2.4)
  normalize(looped, 0.66)
  return looped
}

/**
 * 3) 早晨集市 — G 大调,轻快 bossa,马林巴主奏加短动机重复,最有精神。
 */
function trackMorning() {
  const bpm = 108
  const beat = 60 / bpm
  const swing = 0.08
  const buffer = createBuffer(8 * 4 * beat + 3)

  const chart = [
    { bass: 'G2', voicing: ['B3', 'D4', 'F#4', 'A4'], hits: [0.5, 1.5, 2.5, 3.5] },
    { bass: 'E2', voicing: ['G3', 'B3', 'D4', 'F#4'], hits: [0.5, 1.5, 2.5, 3.5] },
    { bass: 'A2', voicing: ['C#4', 'E4', 'G4', 'B4'], hits: [0.5, 1.5, 2.5, 3.5] },
    { bass: 'D2', voicing: ['F#3', 'C4', 'E4', 'A4'], hits: [0.5, 1.5, 2.5, 3.5] },
    { bass: 'G2', voicing: ['B3', 'D4', 'F#4', 'A4'], hits: [0.5, 1.5, 2.5, 3.5] },
    { bass: 'C2', voicing: ['E3', 'G3', 'B3', 'D4'], hits: [0.5, 1.5, 2.5, 3.5] },
    { bass: 'A2', voicing: ['C4', 'E4', 'G4', 'B4'], hits: [0.5, 1.5, 2.5, 3.5] },
    { bass: 'D2', voicing: ['F#3', 'C4', 'E4', 'A4'], hits: [0.5, 1.5, 2.5, 3.5] },
  ]
  const totalBeats = layChart(buffer, chart, { beat, swing, rhodesGain: 0.17, bassGain: 0.28, padGain: 0.07 })
  layShaker(buffer, totalBeats, beat, swing, 0.055)

  // 三音动机在不同和弦上重复,是动森旋律很常见的写法
  layMelody(buffer, [
    ['D5', 0.5, 0.5], ['E5', 1, 0.5], ['B4', 1.5, 1], ['A4', 2.5, 0.5], ['B4', 3, 1, 0.85],
    ['B4', 4.5, 0.5], ['D5', 5, 0.5], ['G4', 5.5, 1], ['F#4', 6.5, 0.5], ['G4', 7, 1, 0.85],
    ['E5', 8.5, 0.5], ['G5', 9, 0.5], ['C#5', 9.5, 1], ['B4', 10.5, 0.5], ['A4', 11, 1, 0.85],
    ['F#5', 12.5, 0.5], ['E5', 13, 0.5], ['C5', 13.5, 1], ['A4', 14.5, 0.5], ['D5', 15, 1, 0.9],
    ['D5', 16.5, 0.5], ['E5', 17, 0.5], ['B4', 17.5, 1], ['A4', 18.5, 0.5], ['B4', 19, 1, 0.85],
    ['G5', 20.5, 0.5], ['E5', 21, 0.5], ['D5', 21.5, 1], ['B4', 22.5, 0.5], ['G4', 23, 1, 0.85],
    ['A4', 24.5, 0.5], ['C5', 25, 0.5], ['E5', 25.5, 1], ['G5', 26.5, 0.5], ['E5', 27, 1, 0.85],
    ['F#5', 28.5, 0.5], ['A5', 29, 0.5], ['D5', 29.5, 1.5], ['B4', 31, 1, 0.8],
  ], { beat, swing, timbre: MARIMBA, gain: 0.33 })

  lowpass(buffer, 7000)
  reverb(buffer, { mix: 0.22 })
  const looped = makeSeamless(buffer, 1.5)
  normalize(looped, 0.72)
  return looped
}

// —— 主流程 ——

const TRACKS = [
  { id: 'afternoon', title: '午后农场', render: trackAfternoon },
  { id: 'dusk', title: '黄昏散步', render: trackDusk },
  { id: 'morning', title: '早晨集市', render: trackMorning },
]

mkdirSync(OUT_DIR, { recursive: true })
for (const track of TRACKS) {
  const samples = track.render()
  const path = join(OUT_DIR, `bgm-${track.id}.wav`)
  writeWav(path, samples)
  console.log(`${track.title.padEnd(6)} ${track.id.padEnd(11)} ${(samples.length / SAMPLE_RATE).toFixed(1)}s  ${path}`)
}
