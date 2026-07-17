// 词库入口:数组顺序 = 投放顺序(SPEC §4.2,主题包整包顺序投放)
// 「好吃的!」为皮皮钦定首发,永远排第一;新增词包在数组尾部追加

import type { Word } from './types'
import { FOOD_WORDS } from './pack-food'
import { ANIMAL_WORDS } from './pack-animals'
import { COLOR_SHAPE_WORDS } from './pack-colors-shapes'
import { NUMBER_TIME_WORDS } from './pack-numbers-time'
import { BODY_WORDS } from './pack-body'
import { CLOTHES_WORDS } from './pack-clothes'
import { FAMILY_WORDS } from './pack-family'
import { HOME_WORDS } from './pack-home'
import { SCHOOL_WORDS } from './pack-school'
import { NATURE_WORDS } from './pack-nature'
import { CITY_WORDS } from './pack-city'
import { PLAY_WORDS } from './pack-play'
import { ACTION_WORDS } from './pack-actions'
import { DESCRIBE_WORDS } from './pack-describe'

export type { Word, PackName } from './types'
export { PACKS } from './types'

export const WORDS: Word[] = [
  ...FOOD_WORDS,
  ...ANIMAL_WORDS,
  ...COLOR_SHAPE_WORDS,
  ...NUMBER_TIME_WORDS,
  ...BODY_WORDS,
  ...CLOTHES_WORDS,
  ...FAMILY_WORDS,
  ...HOME_WORDS,
  ...SCHOOL_WORDS,
  ...NATURE_WORDS,
  ...CITY_WORDS,
  ...PLAY_WORDS,
  ...ACTION_WORDS,
  ...DESCRIBE_WORDS,
]

export const WORD_MAP = new Map(WORDS.map(word => [word.id, word]))
