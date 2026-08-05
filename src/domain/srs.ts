import { fsrs, generatorParameters, createEmptyCard, Rating, type Card } from 'ts-fsrs'

// 目标保留率 0.9:复习正确率保持在 85–90%,"有点挑战但总能赢"
const scheduler = fsrs(generatorParameters({ request_retention: 0.9 }))

// now 可注入:家长页快进需要按过去日期建卡/打分;省略时保持原行为
export function newCard(now: Date | number = new Date()): Card {
  return createEmptyCard(new Date(now))
}

// 儿童友好的两键评分:认识 → Good,还不熟 → Again
export function rate(card: Card, know: boolean, now: Date | number = new Date()): Card {
  const result = scheduler.next(card, new Date(now), know ? Rating.Good : Rating.Again)
  return result.card
}
