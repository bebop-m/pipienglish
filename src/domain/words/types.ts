// 词库类型与主题包注册表(SPEC §4)
// 领域纯数据:禁止 import Dexie/React/图片路径/CSS 类名

export interface Word {
  /** 稳定 ID(=首次收录时的英文原词):一经发布永不更改、永不复用 —— cards/seen/rescue/ink 全部以它为键 */
  id: string
  word: string
  /** 美式音标(含左右斜杠,如 /ˈæpl/),与 TTS en-US 一致 */
  ipa: string
  /** 中文释义,儿童语言 */
  meaning: string
  /** 开发占位与家长页展示;面向小皮的构建必须使用 imageAssetId 对应的 F4 插图(SPEC §7 美术) */
  emoji: string
  /** 简单例句(L1 ≤8 个词),必须包含该词或其常见词形变化 */
  sentence: string
  sentenceCn: string
  pack: PackName
  /** 频率层级(SPEC §4.1) */
  level: 1 | 2 | 3
  /** F4 本地单词插图资产 ID(P1 资产,Codex 按视觉系统 §10 验收后回填) */
  imageAssetId?: string
}

/** 主题包注册表:数组顺序 = 投放顺序(SPEC §4.2;「好吃的!」为皮皮钦定首发,永远第一) */
export const PACKS = [
  '好吃的!',
  '动物朋友',
  '颜色和形状',
  '数字和时间',
  '我的身体',
  '穿什么',
  '家人和朋友',
  '我的家',
  '学校生活',
  '天气和大自然',
  '出门去',
  '玩和运动',
  '动起来',
  '什么样子',
] as const

export type PackName = (typeof PACKS)[number]

/** 每个词包文件用它生成本包的词条构造器 */
export function definePack(pack: PackName, level: 1 | 2 | 3) {
  return (word: string, ipa: string, meaning: string, emoji: string, sentence: string, sentenceCn: string): Word => ({
    id: word,
    word,
    ipa,
    meaning,
    emoji,
    sentence,
    sentenceCn,
    pack,
    level,
  })
}
