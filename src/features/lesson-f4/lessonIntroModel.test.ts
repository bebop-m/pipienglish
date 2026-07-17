import { describe, expect, it } from 'vitest'
import { lessonIllustrationFilename, lessonProgressPercent, repeatedWordUtterance } from './lessonIntroModel'

describe('H-1 听看卡模型', () => {
  it('只为登记过的词返回批准插图，其他词走无图版', () => {
    expect(lessonIllustrationFilename({ id: 'egg', word: 'egg', meaning: '鸡蛋', sentence: '', sentenceCn: '', imageAssetId: 'egg-f4-v2' })).toBe('egg-f4-v2.png')
    expect(lessonIllustrationFilename({ id: 'egg', word: 'egg', meaning: '鸡蛋', sentence: '', sentenceCn: '' })).toBeNull()
    expect(lessonIllustrationFilename({ id: 'because', word: 'because', meaning: '因为', sentence: '', sentenceCn: '' })).toBeNull()
  })

  it('只接受批准登记表中的资源，不接受未知文件名或路径', () => {
    const base = { id: 'custom', word: 'custom', meaning: '自定义', sentence: '', sentenceCn: '' }
    expect(lessonIllustrationFilename({ ...base, imageAssetId: 'egg-f4-v2.png' })).toBe('egg-f4-v2.png')
    expect(lessonIllustrationFilename({ ...base, imageAssetId: 'apple-f4.webp' })).toBeNull()
    expect(lessonIllustrationFilename({ ...base, imageAssetId: '../bad.png' })).toBeNull()
  })

  it('进度限制在 0–100%，自动发音生成两遍词形', () => {
    expect(lessonProgressPercent(3, 18)).toBeCloseTo(16.6667, 3)
    expect(lessonProgressPercent(20, 18)).toBe(100)
    expect(lessonProgressPercent(-1, 18)).toBe(0)
    expect(lessonProgressPercent(1, 0)).toBe(0)
    expect(repeatedWordUtterance(' egg ')).toBe('egg. egg.')
  })
})
