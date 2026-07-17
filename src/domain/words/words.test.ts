// 词库质量门禁:errors 必须为空;v0.1 学习记录必须永远可映射

import { describe, expect, it } from 'vitest'
import { WORDS, WORD_MAP, PACKS } from './index'
import { checkWordBank, findOrphanIds, sentenceContainsWord } from './quality'
import { LEGACY_V01_IDS } from './legacyIds'

describe('词库质量门禁', () => {
  const report = checkWordBank(WORDS)

  it('无阻断性错误(重复 ID/缺字段/音标格式/例句难度/例句含词)', () => {
    expect(report.errors, report.errors.join('\n')).toEqual([])
  })

  it('v0.1 全部 88 个 ID 仍然存在(学习记录映射不丢)', () => {
    expect(LEGACY_V01_IDS).toHaveLength(88)
    expect(findOrphanIds(LEGACY_V01_IDS, WORDS)).toEqual([])
  })

  it('v0.1 词条的词形与释义未被篡改(抽查锚点)', () => {
    expect(WORD_MAP.get('apple')).toMatchObject({ word: 'apple', meaning: '苹果', pack: '好吃的!' })
    expect(WORD_MAP.get('yummy')).toMatchObject({ meaning: '好吃的(口语)' })
    expect(WORD_MAP.get('ice cream')).toMatchObject({ word: 'ice cream' })
  })

  it('投放顺序:「好吃的!」仍是首发第一包,第一个词是 apple', () => {
    expect(PACKS[0]).toBe('好吃的!')
    expect(WORDS[0].id).toBe('apple')
    expect(WORDS[0].pack).toBe('好吃的!')
  })

  it('L1 骨架规模:≥500 词,全部 14 包已注册且非空', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(500)
    const packsInUse = new Set(WORDS.map(w => w.pack))
    for (const pack of PACKS) expect(packsInUse.has(pack), `词包「${pack}」为空`).toBe(true)
  })

  it('每包每级词数 ≥4(选择题干扰项池)', () => {
    const poolWarnings = report.warnings.filter(w => w.includes('干扰项池'))
    expect(poolWarnings, poolWarnings.join('\n')).toEqual([])
  })

  it('sentenceContainsWord 覆盖常见词形变化', () => {
    expect(sentenceContainsWord('Two cherries are on the cake.', 'cherry')).toBe(true)
    expect(sentenceContainsWord('The monkey loves bananas.', 'banana')).toBe(true)
    expect(sentenceContainsWord('French fries are made of potatoes.', 'potato')).toBe(true)
    expect(sentenceContainsWord('Running makes me thirsty.', 'run')).toBe(true)
    expect(sentenceContainsWord('The pig loves rolling in mud.', 'roll')).toBe(true)
    expect(sentenceContainsWord('I like apples.', 'pear')).toBe(false)
    expect(sentenceContainsWord('A pineapple wears a spiky hat.', 'apple')).toBe(false) // 不允许词中词误判
  })
})
