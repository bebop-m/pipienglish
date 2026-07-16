# F4-CHG-001 · 首页真实变量文案

```yaml
change_id: F4-CHG-001
reason: F4 静态样板文案需要绑定真实 ViewModel 数字
affected_state: daily_incomplete
affected_files:
  - docs/05-architecture/F4_HOME_ARCHITECTURE_PLAN.md
  - visual-regression/v2-copy-candidates/README.md
  - visual-regression/v2-copy-candidates/V2-B-1194x834.png
visual_before: design-samples/sticker-f-farm-v4.html
visual_after: visual-regression/v2-copy-candidates/V2-B-1194x834.png
behavior_change: none
asset_change: none
approval: xiaopi-approved
approved_on: 2026-07-17
```

## 裁决

小皮选择 V-2 排版候选 B，评价为“简单直接”。阶段 C 的 `daily_incomplete` 首页按以下内容落地：

- 有复习时：`{reviewCountToday} 个老朋友想你了！打完招呼再认识 {dailyTarget} 个新朋友。`
- 无复习时：`认识 {dailyTarget} 个新朋友，完成后母鸡妈妈会下蛋哦。`
- 进度：`今日进度 {learnedToday} / {totalItemsToday}`。
- 主按钮：`开始学习！`。
- 底注：`约 {estimatedMinutes} 分钟 · 🥚 奖励 ×{eggsToEarn} · 连续第 {streak} 天`。

F4 母版和图片资产不变；只有动态文字内容与批准的换行结果允许相对母版发生差异。
