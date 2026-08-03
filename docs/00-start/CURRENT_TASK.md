# 当前任务门禁 · 2026-08-03 任务卡片遮挡硬锁修复

```yaml
task_id: BUGFIX-DAILY-BOARD-KEEPOUT-2026-08-03
base_commit: 2484830c3342fea55514494e3da6227e286d31d6
created_at: 2026-08-03T09:20:00+08:00
allowed_paths:
  - docs/00-start/CURRENT_TASK.md
  - docs/03-workflow/changes/**
  - progress.md
  - src/domain/farmLayout.ts
  - src/domain/farmLayout.test.ts
  - src/application/usecases/farmHome.ts
  - src/application/farmHome.test.ts
  - src/features/farm-f4/visual/StageDraggable.tsx
validation_level: L2
required_docs:
  - docs/00-start/AI_START_HERE.md
  - docs/03-workflow/EXECUTION_BUDGET_POLICY.md
visual_references: not_applicable_non_visual_task
forbidden_actions:
  - 改动 src/styles/f4/**（本轮不调 z-index，不改任何已批准视觉）
  - 改动已批准资产、资产清单或 SHA-256 登记
  - 删除或清理 worktree
  - 未经爸爸明确批准不得推送 main 或部署
```

## 本批次来源

小皮实际使用中报告：错题鸡窝（`.rescue-wrap-f4`）被拖到每日任务背景板后面就再也拉不回来。经核实成立，属硬锁。

## 问题与裁决

`.task-board-f3` / `.complete-board-f4` 的 z-index 是 65，孵化小屋 56、救援框 58、角色 20，全部在卡片之下；而落点钳制只限制舞台安全区，允许物件停在卡片矩形内。物件一旦落到卡片背后就完全接收不到指针事件，孩子无法自救 —— 与 F4-CHG-024 批次 #5「坐标飞出屏幕」是同一类硬锁。

裁决：**不动 z-index、不动任何已批准视觉**，改为在领域层给卡片区加落点保留区。拖动过程仍然完全跟手，只有松手落点、持久化写入和备份恢复会被推出保留区。

## 分项

| 顺序 | 分项 | 负责人 | 级别 | 主要路径 | 状态 |
|---:|---|---|---|---|---|
| 1 | 保留区与落点归位 | Claude | **L2** | `farmLayout.ts`、`farmHome.ts`、`StageDraggable.tsx` | **完成** |
| 2 | 门禁与变更记录 | Claude | L1 | `CURRENT_TASK.md`、`F4-CHG-031`、`progress.md` | **完成** |

## 为什么是 L2

保留区进入 `normalizeSceneElementHomes`，即坐标持久化读取路径，备份导入也会经过同一处。按 `EXECUTION_BUDGET_POLICY.md` §L2 必须附带跑 legacy backup fixtures，且损坏坐标、旧存档重放要有目标测试。

## 发布授权

- 待爸爸批准。推送 `main` 会触发 GitHub Pages 部署，未经明确批准不推送。
