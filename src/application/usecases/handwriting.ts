// 手写小游戏用例(SPEC §2.4 + 蛋经济 v2):完成必修后解锁,每轮 ≤10 题,陈旧度加权抽已学词。
// 铁律:游戏结果不写 FSRS(自评+无限次游玩会污染排程),只更新"见面时间";
// "想不起来"照常进救援(SPEC §2.5 含写词游戏)。
// 奖励:完成一轮得 1 颗鸡蛋进库存,每日上限 10 颗;超出上限照常可玩(纯加练)。

import type { PipiDB } from '../db'
import { getFarmStateV3, setFarmStateV3 } from '../db'
import { awardHandwritingRoundEgg } from '../../domain/eggEconomy'
import { weightedSample } from '../../domain/staleness'
import { dayKeyOf } from '../../domain/time'
import { WORD_MAP } from '../../domain/words'

export const HANDWRITING_ROUND_SIZE = 10

export function createHandwritingUsecases(d: PipiDB) {
  /** 解锁条件:今日必修已完成(SPEC §2.4;首页木牌只在完成态出现,这里是数据侧防线) */
  async function unlockedToday(now = Date.now()): Promise<boolean> {
    const session = await d.sessions.get(dayKeyOf(now))
    return session?.completed === true
  }

  /**
   * 抽一轮题:已学词(有 FSRS 卡且仍在词库)按陈旧度加权不放回抽样,
   * 词不足 10 个时整池出题(前几天词少也能玩)。不限轮数,每轮独立随机。
   */
  async function buildRound(now = Date.now(), rng: () => number = Math.random): Promise<string[]> {
    if (!(await unlockedToday(now))) return []
    const [cards, seenRows] = await Promise.all([d.cards.toArray(), d.seen.toArray()])
    const seenMap = new Map(seenRows.map(r => [r.wordId, r.lastSeenAt]))
    const pool = cards
      .filter(card => WORD_MAP.has(card.wordId))
      .map(card => {
        const reviewedAt = card.card.last_review ? new Date(card.card.last_review).getTime() : 0
        return {
          wordId: card.wordId,
          lastSeenAt: seenMap.get(card.wordId) ?? (Number.isFinite(reviewedAt) ? reviewedAt : 0),
        }
      })
    return weightedSample(pool, Math.min(HANDWRITING_ROUND_SIZE, pool.length), now, rng)
  }

  /** 写对一题:只更新见面时间(逛游戏 = FSRS 之外的第二张安全网) */
  async function recordCorrect(wordId: string, now = Date.now()): Promise<void> {
    await d.seen.put({ wordId, lastSeenAt: now })
  }

  /** 想不起来:进救援队列(小鸡被抓)+ 更新见面时间;同样不写 FSRS */
  async function recordForgot(wordId: string, now = Date.now()): Promise<void> {
    await d.transaction('rw', d.rescue, d.seen, async () => {
      await d.rescue.put({ wordId, capturedAt: now })
      await d.seen.put({ wordId, lastSeenAt: now })
    })
  }

  /** 今日已领的游戏奖励蛋数(供入口文案:还有奖励 or 纯加练) */
  async function gameEggsToday(now = Date.now()): Promise<number> {
    const session = await d.sessions.get(dayKeyOf(now))
    return session?.gameEggs ?? 0
  }

  /**
   * 完成一轮:未到日上限 → 鸡蛋 +1 进库存(可孵化可煎,同一种蛋);到上限 → 不发但照常可玩。
   * 计数落在当日会话行,跨日自然清零,随备份导出。
   */
  async function awardRound(now = Date.now()): Promise<'egg' | 'capped'> {
    let result: 'egg' | 'capped' = 'capped'
    await d.transaction('rw', d.kv, d.sessions, async () => {
      const session = await d.sessions.get(dayKeyOf(now))
      if (!session) return
      const today = dayKeyOf(now)
      const farm = await getFarmStateV3(d, { now, today })
      const reward = awardHandwritingRoundEgg(session, farm, today)
      if (reward.awarded === 0) return
      await d.sessions.put(reward.session)
      await setFarmStateV3(d, reward.farm)
      result = 'egg'
    })
    return result
  }

  return { unlockedToday, buildRound, recordCorrect, recordForgot, gameEggsToday, awardRound }
}

export type HandwritingUsecases = ReturnType<typeof createHandwritingUsecases>
