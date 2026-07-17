// 词库质量检查(纯函数):words.test.ts 强制 errors 必须为空
// 覆盖:重复 ID、缺失字段、音标格式、例句难度、例句含词、干扰项池、插图缺口、旧记录映射

import type { Word } from './types'
import { PACKS } from './types'

export interface QualityReport {
  /** 阻断发布的问题(测试红) */
  errors: string[]
  /** 允许暂存的缺口(如缺 F4 插图),供爸爸/Codex 排期 */
  warnings: string[]
}

/** L1 例句 ≤8 词(图片为主,不啃长句);L2/L3 随年龄放宽 */
const MAX_SENTENCE_WORDS: Record<1 | 2 | 3, number> = { 1: 8, 2: 12, 3: 14 }

/** 选择题需要 1 正确 + 3 干扰,同包同级词池至少 4 个(见 domain/lesson 干扰项规则) */
export const MIN_DISTRACTOR_POOL = 4

export function sentenceWordCount(sentence: string): number {
  return sentence.trim().split(/\s+/).filter(Boolean).length
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 例句是否包含该词(容忍常见词形变化:复数/三单/过去式/进行时/比较级/y→ies) */
export function sentenceContainsWord(sentence: string, word: string): boolean {
  const s = sentence.toLowerCase()
  const base = word.toLowerCase()
  const variants = new Set([base, `${base}s`, `${base}es`, `${base}d`, `${base}ed`, `${base}ing`, `${base}er`, `${base}est`])
  if (base.endsWith('y')) {
    const stem = base.slice(0, -1)
    variants.add(`${stem}ies`)
    variants.add(`${stem}ied`)
  }
  if (base.endsWith('e')) variants.add(`${base.slice(0, -1)}ing`)
  const last = base[base.length - 1]
  variants.add(`${base}${last}ing`)
  variants.add(`${base}${last}ed`)
  return [...variants].some(v => new RegExp(`(^|[^a-z])${escapeRegExp(v)}([^a-z]|$)`).test(s))
}

/** 全量体检:错误必须清零,警告供排期 */
export function checkWordBank(words: readonly Word[]): QualityReport {
  const errors: string[] = []
  const warnings: string[] = []
  const packSet = new Set<string>(PACKS)

  // 重复 ID(ID = 学习记录的键,重复会互相覆盖)
  const seen = new Map<string, string>()
  for (const w of words) {
    const prev = seen.get(w.id)
    if (prev) errors.push(`重复 ID「${w.id}」:同时出现在「${prev}」和「${w.pack}」`)
    else seen.set(w.id, w.pack)
  }

  for (const w of words) {
    const tag = `[${w.pack}] ${w.id}`
    // 缺失字段
    for (const [field, value] of Object.entries({
      id: w.id, word: w.word, ipa: w.ipa, meaning: w.meaning,
      emoji: w.emoji, sentence: w.sentence, sentenceCn: w.sentenceCn,
    })) {
      if (!String(value ?? '').trim()) errors.push(`${tag}:字段 ${field} 为空`)
    }
    // 音标格式:/.../
    if (w.ipa && !/^\/[^/]+\/$/.test(w.ipa)) errors.push(`${tag}:音标格式异常「${w.ipa}」(应为 /…/)`)
    // 归属与层级
    if (!packSet.has(w.pack)) errors.push(`${tag}:词包「${w.pack}」未注册`)
    if (![1, 2, 3].includes(w.level)) errors.push(`${tag}:层级 ${w.level} 非法`)
    // 例句必须包含该词(否则听看卡/例句朗读对不上)
    if (w.sentence && !sentenceContainsWord(w.sentence, w.word)) {
      errors.push(`${tag}:例句不含该词 →「${w.sentence}」`)
    }
    // 例句难度(词数上限)
    const count = sentenceWordCount(w.sentence)
    if (count > MAX_SENTENCE_WORDS[w.level]) {
      errors.push(`${tag}:例句 ${count} 词,超过 L${w.level} 上限 ${MAX_SENTENCE_WORDS[w.level]} →「${w.sentence}」`)
    }
    // 释义混入英文正文(允许单个大写字母,如 T恤)
    if (/[a-z]{2,}/.test(w.meaning)) warnings.push(`${tag}:释义疑似混入英文「${w.meaning}」`)
  }

  // 同包同释义:选择题干扰项会出现两个"正确"选项
  const byPack = new Map<string, Word[]>()
  for (const w of words) {
    const list = byPack.get(w.pack) ?? []
    list.push(w)
    byPack.set(w.pack, list)
  }
  for (const [pack, list] of byPack) {
    const meanings = new Map<string, string>()
    for (const w of list) {
      const prev = meanings.get(w.meaning)
      if (prev) warnings.push(`[${pack}] 释义重复「${w.meaning}」:${prev} / ${w.id}(干扰项抽取已按释义去重,仅提示)`)
      else meanings.set(w.meaning, w.id)
    }
    // 干扰项池:同包同级 ≥4
    const byLevel = new Map<number, number>()
    for (const w of list) byLevel.set(w.level, (byLevel.get(w.level) ?? 0) + 1)
    for (const [level, n] of byLevel) {
      if (n < MIN_DISTRACTOR_POOL) warnings.push(`[${pack}] L${level} 仅 ${n} 词,不足选择题干扰项池 ${MIN_DISTRACTOR_POOL}(将回退全库同级抽取)`)
    }
  }

  // 缺 F4 插图(P1 资产,SPEC §5.2 选择题图像辅助)
  const noImage = words.filter(w => !w.imageAssetId).length
  if (noImage > 0) warnings.push(`${noImage}/${words.length} 词尚无 F4 插图资产(imageAssetId),依赖 Codex P1 排期`)

  return { errors, warnings }
}

/**
 * 旧学习记录映射检查:历史快照中的 ID 必须仍在词库里。
 * 也可在家长页运行时用 cards 表的真实 wordId 调用,检测"库里查无此词"的孤儿记录。
 */
export function findOrphanIds(recordedIds: readonly string[], words: readonly Word[]): string[] {
  const ids = new Set(words.map(w => w.id))
  return recordedIds.filter(id => !ids.has(id))
}
