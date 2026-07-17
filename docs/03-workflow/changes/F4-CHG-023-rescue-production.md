---
change_id: F4-CHG-023
date: 2026-07-17
stage: rescue-production
affected_state:
  - farm_daily_paused
  - rescue_intro
  - rescue_trace
  - rescue_choice
  - rescue_dictation
  - farm_rescue_count
production_behavior_change: rescue-loop-opened
visual_after:
  - visual-regression/rescue-production/paused-task-board-1194x834.png
  - visual-regression/rescue-production/rescue-1-listen-1194x834.png
  - visual-regression/rescue-production/rescue-2-trace-1194x834.png
  - visual-regression/rescue-production/rescue-3-choice-1194x834.png
  - visual-regression/rescue-production/rescue-4-dictation-1194x834.png
approval: dad-approved
release_gate: direct-production-no-xiaopi-review
---

# 救援闭环与暂停日任务板生产接入

爸爸裁决救援界面直接复用现有学习界面：每个错词按听看、描红、选择、默写四段完成；本轮完成验证后直接上线，不再等待小皮逐屏审核。

## 正式行为

- 农场待救入口开放，救援队列按 `capturedAt` 先进先出。
- 听看卡强制正式无图版；描红不评分、不留笔迹；选择和默写答错原地重试；救援默写隐藏“想不起来”。
- 阶段逐步写回 `RescueRow.stage`，旧记录无阶段时从听看开始。
- 最后一段答对后仍保留救援记录，点击“继续”才在同一事务中删除记录并更新 `seen.lastSeenAt`。
- 救援不修改 FSRS、session、连胜、鸡蛋或农场小鸡总数。
- 新词暂停日显示 `连续 {streak} 天！` 与 `今天复习 {reviewCountToday} 个老朋友。`。
- 单词插图延期，已有 egg 保留；复习头部不改；手写小游戏和家长页继续门控。

## 验证

- 全量自动测试 110/110、TypeScript 与生产 PWA 构建通过；Workbox 预缓存 21 项。
- 生产 QA 覆盖四阶段、错答重试、最后继续原子完成、角标 1→0、暂停任务板、Service Worker 断网冷启动及图片缓存。
- 1194×834 新截图独立存放于 `visual-regression/rescue-production/`，未覆盖 Stage H 基准。
- Chromium 批量抓图出现黑块时改用独立进程、停用截图动画并等待合成稳定后重抓；最终归档图以肉眼复查通过的无伪影版本为准。
