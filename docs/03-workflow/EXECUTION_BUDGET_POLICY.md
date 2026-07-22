# 执行预算与验证政策

本政策的目标是削减重复上下文、无目的完整重读和重复图片处理，同时保持验证门槛。它不承诺任何具体 token 倍数，也不以少跑必要检查换取表面节省。

## 1. 任务门禁与范围

每轮先读 `docs/00-start/CURRENT_TASK.md`，回答 `AI_START_HERE.md` 四问，并执行：

```bash
git merge-base --is-ancestor <base_commit> HEAD
```

非零退出立即停止。开始前和交付前都要把下列三类路径合并检查：

- `git diff --name-only`：未暂存的已跟踪文件；
- `git diff --cached --name-only`：已暂存文件；
- `git ls-files --others --exclude-standard`：未跟踪文件。

任一路径不在 `allowed_paths` 时立即停止，不顺手修复；将越界内容重新路由到独立任务。若遇到用户脏改动冲突，同样停止并说明。

## 2. 上下文与并行预算

- 默认由 **1 个总控 + 1–2 个真正独立任务**组成；没有独立边界时由总控单独完成。
- 独立任务必须拥有互不重叠的写路径和可单独验证的结果。
- 禁止多个任务并发修改共享的 `src/domain/`；同样避免并发修改共享接口、锁文件和迁移入口。
- 总控统一做基线、范围、最终 diff、全仓验证与一次构建，子任务只报告压缩后的关键信息和失败证据。
- 只读材料按任务路由加载；禁止“为了放心”完整重读全部规格、历史、图片或日志。
- 代码/数据任务默认不打开视觉 PNG。只有图片本身是输入、哈希/尺寸需核验或视觉验收被明确要求时才读取。
- 美术或视觉生成任务必须按 `docs/02-visual/F4_VISUAL_SYSTEM.md` §9.1 实际打开目标对应的最小身份/画风锚图；文字说明、环境背景、场景总览或截图不得替代角色身份锚图。

## 3. 本地检查点与发布边界

- 检查点只允许在本地 `codex/wip-*` 分支或隔离 worktree 上创建。
- WIP 不进入 `main`，不 push、不部署，也不作为已批准生产资产来源。
- 只有完成 L3、通过所需人工/产品批准并走正常审查后，才可由获授权流程合并或发布。
- 本政策不授权删除、prune、移动、清理、reset 或覆盖任何 worktree 与用户改动。

## 4. 验证等级

### L1 · 普通子任务最低门槛

普通子任务至少运行以下全仓检查，输出可压缩为通过/失败、测试数、耗时和关键错误，但不可用截断掩盖失败：

```bash
npm test
npm run typecheck
npm run check:fullbleed
git diff --check
```

美术或视觉生成任务在上述 L1 检查之外，还必须先让 `CURRENT_TASK.md` 的机器可检引用字段通过：

```bash
npm run check:visual-references
```

该门禁验证角色身份锚图、参考职责、变体允许范围和引用文件存在性；失败时不得调用图片生成或编辑工具。

修改后必须用 `git diff` 审查实际补丁。纯文档任务仍须检查 diff 和空白错误；若总控明确在同一 HEAD 上统一执行全仓命令，子任务可引用该次结果，不重复运行。

### L2 · 高风险状态与持久化

下列任一内容自动升级 L2：

- 数据迁移、持久化形状或数据库启动写入；
- 备份导出、导入、恢复或版本兼容；
- 鸡蛋原子扣除、退款或防重复结算；
- 章节 `acknowledged`、完成日或解锁边界。

L2 包含 L1，并必须运行 legacy backup fixtures：

```bash
npm test -- src/application/backup.test.ts src/application/migration.test.ts src/application/farmPersistence.test.ts
```

涉及的原子事务、幂等、损坏输入、旧版本重放和失败回滚用例也必须纳入目标测试。不得只验证新格式 happy path。

### L3 · 构建/发布集成门槛

L3 包含 L1；若同时命中 L2，也包含 legacy backup fixtures。普通任务不重复生产 build，由总控/L3 在同一最终 HEAD 上跑一次。

下列文件或机制一旦改变，执行该子任务的人必须先跑 Pages 构建，总控在最终集成态保留一次权威结果：

- `vite.config.*`；
- `package.json`、锁文件；
- `tsconfig*`；
- `.github/workflows/*`；
- PWA、Service Worker、manifest；
- `public/` 资产或资产清单；
- GitHub Pages `base`、构建守卫；
- 动态导入、分包或会改变产物图的配置。

命令：

```bash
GITHUB_PAGES=true npm run build
```

PowerShell 使用 `$env:GITHUB_PAGES='true'; npm run build`，命令结束后应移除本进程变量。

## 5. PWA/Pages 风险清单

- Workbox 单文件 precache 上限是 **3 MiB**；超过上限的文件可能静默缺席离线包，必须检查构建输出警告和最终清单。
- `globPatterns` 是明确白名单；新扩展名不会自动进入 precache。新增资产类型时必须同时核对模式和离线行为。
- 本地开发/普通构建使用根路径 `/`，GitHub Pages 使用 `/pipienglish/`。图片、manifest、SW scope、动态导入和路由必须在 Pages base 下复核，不能以本地 `/` 成功替代。
- PWA/资产变更除构建成功外，还要确认关键文件确实进入预缓存；涉及孩子使用时再按批准矩阵做断网和真机门槛。

## 6. Diff 审查门槛

任何修改后都运行并阅读 `git diff`。以下改动必须做逐块 diff 审查，不能只看文件清单或测试绿灯：

- 重大补丁或大段删除；
- 格式化和机械批量改写；
- 数据迁移、备份恢复；
- 状态机与事务；
- 多文件接口变更；
- 构建、PWA、Pages 与动态导入。

最终交付至少记录：基线祖先结果、范围检查、`git diff --stat`、验证等级、每条命令结果、构建触发原因，以及明确未执行的 push/部署/清理动作。
