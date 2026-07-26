# 当前任务门禁 · 2026-07-25 代码审查修复批次

```yaml
task_id: REVIEW-FIXES-2026-07-25
base_commit: 626db8baf729bbc527ea1b510fd5844d095eb4b1
created_at: 2026-07-26T11:36:00+08:00
allowed_paths:
  - docs/00-start/CURRENT_TASK.md
  - docs/00-start/AI_START_HERE.md
  - docs/01-product/SPEC.md
  - docs/01-product/FARM_LONG_TERM_ECONOMY_PROPOSAL.md
  - docs/03-workflow/changes/**
  - progress.md
  - package.json
  - .github/workflows/deploy.yml
  - src/domain/farmLayout.ts
  - src/domain/farmLayout.test.ts
  - src/application/usecases/farmHome.ts
  - src/application/farmHome.test.ts
  - src/application/backup.test.ts
  - src/features/farm-f4/useFarmHome.ts
  - src/features/farm-f4/useFarmHome.test.ts
  - src/features/farm-f4/visual/FarmActors.tsx
  - src/features/farm-f4/visual/FarmHomeDaily.tsx
  - src/features/farm-f4/visual/StageDraggable.tsx
  - src/features/farm-f4/visual/StageDraggable.test.ts
validation_level: L3
required_docs:
  - docs/00-start/AI_START_HERE.md
  - docs/03-workflow/EXECUTION_BUDGET_POLICY.md
visual_references: not_applicable_non_visual_task
forbidden_actions:
  - 两个执行者同时修改同一工作树
  - 越过下方交接表领取未轮到自己的分项
  - 在本批次内实施 #2 sceneLoadouts 数据层或异色扩款（各自独立立项）
  - 修改任何已批准资产、资产清单或 SHA-256 登记
  - 删除或清理 worktree（独立审计后另行批准）
  - 未经爸爸明确批准不得部署
```

## 发布授权

- 2026-07-26，爸爸明确批准：提交并推送 `main`，允许本批次触发 GitHub Pages 部署。

## 本批次来源

2026-07-25 Codex 对 7 月 19 日以来提交的审查，报告 5 项问题。Claude 已逐条核实，全部成立，无误报。本文件覆盖其中 4 项；`#2 sceneLoadouts` 与异色扩款不在本批次内。

## 分项与串行交接

| 顺序 | 分项 | 负责人 | 级别 | 主要路径 | 状态 |
|---:|---|---|---|---|---|
| 1 | 建立本门禁 | Claude | L1 | `docs/00-start/CURRENT_TASK.md` | **完成** |
| 2 | #5 拖动坐标钳制 | Codex | **L2** | `farmLayout.ts`、`StageDraggable.tsx` | **完成** |
| 3 | #3 孵化揭晓竞态 | Codex | L1 | `useFarmHome.ts` | **完成** |
| 4 | #1 场景例外补进 SPEC ＋ #4 门禁接入检查 | Claude | **L3** | `SPEC.md`、`package.json`、`deploy.yml` | **完成** |

每完成一项，负责人更新本表状态并交回，下一位才可开工。任何时刻只有一个执行者持有工作树。

### 为什么 #5 是 L2

坐标经 KV 持久化，且备份导入会原样恢复自定义 KV（`backup.ts` 恢复路径）。按 `EXECUTION_BUDGET_POLICY.md` §L2，持久化形状与备份恢复自动升级，必须附带跑：

```bash
npm test -- src/application/backup.test.ts src/application/migration.test.ts src/application/farmPersistence.test.ts
```

损坏坐标、超大坐标、旧备份重放必须进目标测试，不得只验 happy path。若钳制逻辑需落在 `backup.ts` 或 usecase 读取处，先更新本文件的 `allowed_paths` 再动手。

### 为什么第 4 项是 L3

`#4` 要把 `check:visual-references` 接进 `npm run build` 或 CI，改动构建机制，按 §L3 必须在最终 HEAD 上跑一次 Pages 构建。

## 待修问题摘要

- **#5** `farmLayout.ts` 的 `normalizeSceneElementHomes` 只校验 `Number.isFinite`，无范围钳制。损坏数据或旧备份中的超大坐标会让鸡窝、救援框永久落到屏幕外，孵化入口消失且孩子无法自行拖回 —— 本批次唯一的硬锁风险，优先级最高。读取时应按元素尺寸钳制或回退默认值。
- **#3** `runGuard` 的 async task 在设完 `setTimeout` 即 resolve，`guardRun.current` 随之清空。800ms＋1500ms 揭晓动画期间若再触发 `focus`／`visibilitychange`，第二次守卫因无新结算而直接 `commitCore(next)` 提交含新小鸡的完整 VM，小鸡会提前出现再补播入场动画。需在揭晓期间阻止普通刷新覆盖，或把过渡态并入核心 VM。
- **#1** `SPEC.md` §场景内容要求每章核心包含 2 款异色小鸡、免费路牌、3 件贴纸、收费装扮；场景二仅 1 款异色，路牌／贴纸／装扮仍为 `internal-placeholder`，而 `availableChapter` 只校验章节号连续性。**这是爸爸批准的例外**（见下方历史记录），处置方式是把例外写进 SPEC，不是退回场景二。注意「2 款异色」场景一同样未达标，根因是款式池，与异色扩款立项同源。
- **#4** 上一版门禁停留在 7-22 已完成的任务、`base_commit` 仍是 `fe4a4ac`，且引用了两个本机绝对路径（`.codex/visualizations/...`、`pipienglish-recovery/...`），换机或 CI 必失败。`check:visual-references` 未接入 `npm run build`（当前只有 `check-fullbleed-layers`）也未接入 `deploy.yml`，实际只是可手动运行的检查。本版已改用 `not_applicable_non_visual_task` 消除绝对路径；接入 CI 留待第 4 项。

## 已知越界记录

提交 `5bb7d58`（概率调整）修改了 `docs/01-product/**` 与 `docs/03-workflow/changes/**`，二者不在上一版门禁的 `allowed_paths` 内。改动内容本身必要且已验收，但执行者未在动手前更新门禁。本版已将这两条纳入 `allowed_paths`。

## 上一任务的批准状态（保留供追溯）

上一门禁 `SCENE-1-2-FROZEN-HATCHERY-INTEGRATION-2026-07-22` 已验收完成，其批准记录中与本批次相关的一条：

> 场景二发布：爸爸已明确批准合并执行。场景二已进入 `FARM_SCENE_DEFINITIONS`，`availableChapter=2`；苹果园 12 个生产资产进入当前 Service Worker 预缓存。未批准的路牌、贴纸和装扮仍按各自 `assetStatus` 过滤，不生成占位图片节点。

完整历史见 `docs/03-workflow/archive/` 与相关 F4-CHG 变更记录。
