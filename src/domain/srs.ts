import { fsrs, generatorParameters, createEmptyCard, Rating, type Card } from 'ts-fsrs'

// 目标保留率 0.9:复习正确率保持在 85–90%,"有点挑战但总能赢"
const scheduler = fsrs(generatorParameters({ request_retention: 0.9 }))

export function newCard(): Card {
  return createEmptyCard(new Date())
}

// 儿童友好的两键评分:认识 → Good,还不熟 → Again
export function rate(card: Card, know: boolean): Card {
  const result = scheduler.next(card, new Date(), know ? Rating.Good : Rating.Again)
  return result.card
}
