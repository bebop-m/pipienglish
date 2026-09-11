---
change_id: F4-CHG-034
date: 2026-09-10
stage: learning-rules
affected_state:
  - daily_session
  - lesson_plan
  - meta.streak
  - meta.freezeCards
production_behavior_change: implemented
approval: dad-final-approved-2026-09-10 (2+12、守护卡上限 3、不给首字母提示、必修改为 1 颗蛋)
independent_review: not-required
release_gate: domain-and-usecase-tests + L2 legacy backup fixtures
source_of_truth: docs/01-product/SPEC.md §2.2 / §3.3 / §5.1 / §5.3
supersedes: SPEC §5.1 暂停新词规则、§5.3 复习题型分配、§3.3 补签卡草案
---

# 学习节奏重定：复习全部拼写、每日 2 新词 + 12 复习、连胜守护卡、必修 1 颗蛋

爸爸 2026-09-10 看到小皮 iPad 上 DAY 38 整课没有书写后裁决三件事：复习的每一个词都要走拼写；每天新词数量与复习节奏由 Claude 给建议；连续一周打卡得一张连胜保护机会。当晚确认采用 2 + 12、守护卡上限 3、不给首字母提示，并追加第 4 条：必修完成奖励从 2 颗蛋改为 1 颗，「想多拿鸡蛋就得多做练习」。四条已于 2026-09-11 实施上线。

## 背景

- 7-17 定的 6 复习 + 4 新词，配上 SPEC §5.1「连续 3 天到期 >12 就暂停新词」，在 FSRS 的真实节奏下从第三周起每 3 天暂停 2 天（[2026-09-10 审查 §1.3](../reviews/2026-09-10-ipad-a16-scene2-shop-audit.md)）。暂停日没有新词就没有描红和收尾默写；复习又只有记忆强度 ≥ 7 天的词才默写、每日 ≤ 3 张，于是整课可以一个字不写。
- 暂停并不能消化积压：复习上限还是 6，它只是少学新词，把新词速度悄悄压到平均每天 1.3 个。

## 裁决 1（已定）：复习的每一个词都走拼写

- 每张复习卡统一为 H-5 默写卡：显示中文、自动播发音、写英文、客观判定。不再按记忆强度分题型，不再有「默写每日 3 张」上限；选择题和听音辨义退出复习队列（新词自测仍是选择题，救援四段仍是听看→描红→选择→默写）。
- 答错原地重试，首答写 FSRS；「想不起来」进救援（小鸡被抓），与现在一致。
- 预期副作用：昨天刚学的词今天就要默写，失败率会高于现在，救援篮会更常有小鸡。这是产品接受的：救援本来就是补练通道，且不写 FSRS 之外的惩罚。
- 可选软化（默认不做，等小皮反馈）：记忆强度 < 3 天的卡给首字母提示。
- 实施：`src/domain/lesson.ts` 的 `assignReviewTypes` 恒返回 `dictation`；删除 `DICTATION_STABILITY_DAYS`、`DICTATION_DAILY_CAP` 与 `lastQuizType` 交替逻辑；`lesson.test.ts` 相应改写。视觉层零改动，默写卡是小皮已批准的 H-5。

## 裁决 2（已定：2 + 12）：每日 2 个新词，复习上限 12，取消暂停新词

用项目自己的 `srs.ts`（保留率 0.9）按每天 19:00 结算、答对率 88% 模拟 240 天，取第 90–240 天稳态：

| 新词/天 | 复习上限 | 平均积压 | 平均迟到 | 迟到 >14 天占比 | 估时/天 |
|---:|---:|---:|---:|---:|---:|
| 4 | 6（现状） | 385 | 43 天 | 100% | 11.6 分 |
| 4 | 12 | 199 | 14 天 | 36% | 15 分 |
| 4 | 不限 | 29 | 0.3 天 | 0% | 25 分 |
| 3 | 12 | 96 | 7 天 | 0% | 13 分 |
| 3 | 15 | 68 | 3.7 天 | 0% | 15 分 |
| 3 | 不限 | 22 | 0.3 天 | 0% | 19 分 |
| **2** | 10 | 46 | 3.8 天 | 0% | 10 分 |
| **2** | **12** | **29** | **1.7 天** | **0%** | **11 分** |
| 2 | 15 | 17 | 0.6 天 | 0% | 12 分 |

估时口径：新词 2 分钟/个（听看 + 描红 + 自测 + 收尾默写），复习默写 0.6 分钟/张；真机实测若一张默写要 45 秒以上，估时按上表加 2–3 分钟。

- FSRS 在保留率 0.9 下，每天每 1 个新词长期对应约 7 次复习/天。4 个新词诚实的复习量是每天 29 次、25 分钟，超出 SPEC §2.2 的 10–13 分钟目标一倍；把上限压到 6 只是让平均每个词迟到 43 天，界面上看不见而已。
- **建议：2 新词 + 12 复习。** 约 11 分钟，积压稳定在 30 上下，平均迟到 1.7 天，没有词迟到超过两周，四年级每天记 2 个词也是可持续的量。备选：2 + 10（约 10 分钟，迟到 3.8 天），或 3 + 15（约 15 分钟，迟到 3.7 天）。
- 取消暂停新词规则：上限本身就是时长阀门；2 + 12 下积压稳态 29，规则永远不会触发，留着只剩隐患。
- 存量：小皮当前积压约 40–60，2 + 12 下两周内回到稳态，期间每天 12 张都是最过期优先。
- 词库：555 词按每天 2 个约 9 个月用完，年底前需要扩词包（独立待办）。
- 实施：`src/domain/dailyPlan.ts` 的 `NEW_PER_DAY = 2`、`REVIEW_CAP = 12`；删除 `shouldPauseNewWords`、`BACKLOG_PAUSE_THRESHOLD`、`PAUSE_MAX_DAYS`；`DailySession.newWordsPaused` 字段保留读兼容、写恒 `false`；`estimatedMinutes` 改为 新词 × 2 + 复习 × 0.6；首页「今天先复习老朋友」分支删除；`fastForward` 同步新计划；写词游戏每轮 10 题不变。

## 裁决 3（已定）：连续 7 天得 1 张连胜守护卡

- 发卡：`meta.streak` 每到 7 的倍数（7、14、21 …）当天 +1 张。建议持有上限 3 张，超出不再累积——保持卡的分量，也接近 SPEC §3.3 原「每月 3 张」的意图。
- 用卡：漏学后下一次完成时自动结算。漏 k 天需要 k 张：够则扣 k 张，`streak` 接着 +1；不够则一张不扣，`streak` 归 1。不需要小皮操作。
- 展示：完成卡常驻「守护 ×N」；用卡当天完成卡多一句「母鸡用一张守护卡帮你把连续 N 天接上了」；结束页战报同步。
- 家长页：显示张数，可手动 +1（替代 SPEC §3.3「病假旅行自动补」）；快进按 `floor(N / 7)` 发卡，上限 3。
- 取代 SPEC §3.3 的「每月自动发 3 张 + 回落到本月最长纪录」。
- 数据：`MetaState.freezeCards`（SPEC §7 数据模型早已预留此字段名），旧记录缺省 0；`normalizeMeta`、v3 备份导入/导出补默认；无 Dexie 版本升级，但命中 L2「持久化形状」。
- 实施：`src/domain/streak.ts` 的 `completeDay` 扩展为发卡 + 用卡 + 归零三段纯函数；`viewmodel` 增加 `freezeCards` 与 `streakProtectedToday`；`FarmHomeDaily` 完成卡与 `LessonFinishScreen` 文案；`ParentScreen`；`fastForward`；`streak.test.ts`、`backup.test.ts`、`fastForward.test.ts`。

## 裁决 4（已定）：必修完成奖励 2 → 1 颗蛋

- `eggEconomy.ts` 的 `DAILY_LESSON_EGGS = 1`；写词游戏每轮 1 颗、每日 10 颗上限不变。只做必修的蛋正好每天孵一只；贴纸与装扮的消费来源是写词游戏。
- 36 日理论收入：必修 36 + 游戏 ≤360。SPEC §2.3 / §3.1 与经济提案 §2 / §4.1 已同步。

## 裁决 5（2026-09-11 追加）：写词游戏当天第一轮 2 颗蛋

- 爸爸：「4 改成第一轮奖励两颗」。`eggEconomy.ts` 新增 `FIRST_GAME_ROUND_EGGS = 2`，`DailySession.gameRounds` 记轮数（更新前的当天会话缺该字段时按蛋数推算，不会再送一次双倍）；每日最多 11 颗。
- 首页木牌与写词页进度文案按下一轮能拿几颗显示（2 / 1 / 拿满纯加练）。SPEC §2.4、§3.1 与经济提案 §2、§4.2 已同步。

## 实施记录（2026-09-11）

- `dailyPlan.ts`：`NEW_PER_DAY = 2`、`REVIEW_CAP = 12`；删除 `shouldPauseNewWords` 等暂停规则；`estimatedMinutes = 复习 × 0.6 + 新词 × 2`。`DailySession.newWordsPaused` 保留读兼容、不再写入；首页「今天先复习老朋友」分支删除。
- `lesson.ts`：`assignReviewTypes` 恒为 `dictation`；删除 `DICTATION_STABILITY_DAYS`、`DICTATION_DAILY_CAP` 与 `lastQuizType` 交替（卡上的历史 `lastQuizType` 字段保留不用）。
- `streak.ts`：`completeDay` 三段式（用卡接上 / 归 1 / 到 7 倍数发卡，上限 3）；`shieldCardsForStreak` 供快进；`time.ts` 新增 `daysBetween`。`MetaState.freezeCards` / `lastShieldUsedOn` 为可选字段，`normalizeMeta` 与 `defaultMeta` 补默认，无 Dexie 升级。
- `viewmodel.ts`：`freezeCards`、`streakProtectedToday`、`shieldEarnedToday`；完成卡新增「守护卡 ×N」一行；家长页显示张数并可手动补 1 张。
- 测试：`dailyPlan.test`、`streak.test`（10 例）、`eggEconomy.test`、`lesson.test`、`viewmodel.test` 及应用层集成测试全部按新规则改写；legacy backup fixtures 通过。

## 验证计划

- L1：`npm test`、`npm run typecheck`、`npm run check:fullbleed`、`git diff --check`。
- L2：legacy backup fixtures（`meta` 新字段缺省）。
- 定向：`lesson.test.ts`（复习全默写、热身顺序不变）、`dailyPlan.test.ts`（2/12、无暂停）、`streak.test.ts`（发卡边界 7/14、漏 1 天用 1 张、漏 3 天只有 2 张时归 1 且不扣卡、上限 3）。
- 浏览器：快进 Day 40 后开课，确认每张复习都是默写卡；完成卡显示守护数；家长页 +1 卡。

## 爸爸已确认（2026-09-10 晚）

1. 数字取 2 + 12。
2. 守护卡上限 3 张。
3. 不给首字母提示。

## 已同步文档

- `docs/01-product/SPEC.md` §2.2、§3.3、§5.1、§5.3
- `progress.md`
