# 当前任务门禁 · 开发减负方案

```yaml
task_id: DEV-COST-REDUCTION-2026-07-22
base_commit: b4be9fcc71ac17616faffbba3e3800a92ac8d75b
created_at: 2026-07-22T09:53:31+08:00
allowed_paths:
  - docs/00-start/CURRENT_TASK.md
  - docs/00-start/AI_START_HERE.md
  - docs/03-workflow/EXECUTION_BUDGET_POLICY.md
  - docs/03-workflow/archive/progress-2026-07-17.md
  - docs/03-workflow/reviews/2026-07-22-dev-cost-reduction-claude-review.md
  - docs/04-assets/ASSET_BACKLOG_F4.md
  - docs/05-architecture/F4_HOME_ARCHITECTURE_PLAN.md
  - docs/05-architecture/archive/F4_HOME_ARCHITECTURE_PLAN_SECTION_10_HISTORY.md
  - package.json
  - progress.md
validation_level: L3
required_docs:
  - docs/00-start/AI_START_HERE.md
  - docs/01-product/FARM_LONG_TERM_ECONOMY_PROPOSAL.md#2-最终裁决摘要
  - docs/03-workflow/EXECUTION_BUDGET_POLICY.md
forbidden_actions:
  - 修改儿童可见行为或产品规格
  - 实施“当前章＋下一章”五处产品规格变更；须爸爸另签并新建独立 F4-CHG
  - 修改 allowed_paths 以外的仓库文件
  - 删除、prune、移动、清理或修改任何现存 worktree
  - 覆盖恢复备份或用户脏改动
  - reset、checkout 或丢弃用户改动
  - 将候选 PNG 合入 main
  - 将 WIP 合入 main、push 或部署
```

## 开工门禁

1. 确认当前分支为本地 `codex/wip-*`，且不是 `main`。
2. 执行 `git merge-base --is-ancestor b4be9fcc71ac17616faffbba3e3800a92ac8d75b HEAD`；非零退出时立即停止。
3. 修改前后分别汇总已跟踪、暂存和未跟踪路径，并与 `allowed_paths` 逐项核对。
4. 一旦出现许可范围外路径，立即停止当前任务，不修补、不顺手整理；将越界工作重新路由到单独任务。
5. 若目标路径已有与本任务冲突的脏改动，停止并说明，不覆盖。

本任务只调整协作入口、执行预算、验证政策和历史归档，不改变产品规格、运行时代码、儿童界面或生产资产。
