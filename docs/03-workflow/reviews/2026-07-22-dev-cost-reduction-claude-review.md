# Claude 审查材料 · 开发减负方案

## 结论

本轮在本地 `codex/wip-dev-cost-reduction` 分支完成文档/流程调整，基线为 `b4be9fcc71ac17616faffbba3e3800a92ac8d75b`。没有修改运行时代码、儿童可见行为或产品规格；没有 push、部署、合入 `main`、生成/批准新图、接入候选 PNG，也没有删除、prune、移动、清理或修改任何现存 worktree。

“当前章＋下一章”五处产品规格变更明确保持未实施；若未来需要，必须由爸爸另签并建立独立 F4-CHG。

## 1. 3c42 抢救与哈希证据

- 只读来源：`C:\Users\86181\.codex\worktrees\3c42\pipienglish`
- 来源 HEAD：`2602866a02aa6f95c5765b50dc037b4dbe461915`（detached）
- 抢救范围：`docs/04-assets/prototypes/f4-long-term-stage-a/` 与 `scripts/build-f4-stage-a-prototype.py`
- 仓库外备份：`D:\Projects\pipienglish-recovery\2026-07-22-f4-stage-a-3c42`
- 源/备份文件数：`42 / 42`
- 源/备份总字节：`31,579,478 / 31,579,478`
- 重新逐文件计算 SHA-256/字节差异：`0`
- `SOURCE_SHA256.txt` SHA-256：`A8626239C2E5A526473B323F9935C3941EB0AA29E3AEDEC6173ECC0A64A1DB3A`
- `BACKUP_SHA256.txt` SHA-256：`A8626239C2E5A526473B323F9935C3941EB0AA29E3AEDEC6173ECC0A64A1DB3A`
- `RECOVERY_MANIFEST.md` SHA-256：`B327EBA779C62F42F6ADC2EF1E663824BFF864546E67454C3818E9A8973EF85C`

两份哈希清单内容哈希完全一致；备份后又从实际源/备份文件重新计算，仍为 42 文件、同字节、零差异。3c42 保持原状，候选 PNG 仅存在于源 worktree/仓库外恢复材料中。

## 2. 修改文件清单

| 文件 | 目的 |
|---|---|
| `docs/00-start/CURRENT_TASK.md` | task_id、基线、许可路径、L3、必读文档和禁止动作门禁 |
| `docs/00-start/AI_START_HERE.md` | 从全量必读改为核心 + 任务路由；农场补 §11/§15，章节至少 §3/§8.1，代码/数据默认不读 PNG |
| `docs/03-workflow/EXECUTION_BUDGET_POLICY.md` | 上下文/并行预算、local WIP 边界、L1/L2/L3、PWA/Pages 风险和 diff 审查 |
| `docs/03-workflow/archive/progress-2026-07-17.md` | 旧阶段进度归档，开头标注 AI 默认不读取 |
| `docs/03-workflow/reviews/2026-07-22-dev-cost-reduction-claude-review.md` | 本审查材料 |
| `docs/04-assets/ASSET_BACKLOG_F4.md` | 单张校准→批准→冻结分层清单→批量/登记；核心包 9 项原创、缩略图机械派生、装扮按槽位 |
| `docs/05-architecture/F4_HOME_ARCHITECTURE_PLAN.md` | 保留活跃 §0–§9、未决 §11–§12、有效 §13，仅移出历史 §10 |
| `docs/05-architecture/archive/F4_HOME_ARCHITECTURE_PLAN_SECTION_10_HISTORY.md` | 原 §10 历史实施顺序归档，AI 默认不读取 |
| `package.json` | 新增 `typecheck: tsc --noEmit` |
| `progress.md` | 仅保留当前有效状态、当前待办和最近流程阶段 |

`docs/03-workflow/changes/` 未移动、未压缩、零 diff。

## 3. 路由摘要

永远必读只保留四项：`CURRENT_TASK`、农场提案 §2、AI_START 四问、固定共识/不可破坏项。其余按普通代码/数据、长期农场、章节、视觉、美术、PWA/构建、历史追溯七类追加最小材料。

- 长期农场任务强制补读 §11 ViewModel/事件与 §15 已知冲突。
- 章节任务至少补读 §3 章节规则与 §8.1 核心包硬契约。
- 代码/数据默认不打开 PNG；视觉资产只有成为直接输入或验收对象时才读取。
- 历史归档默认不读，先定位问题再按链接打开单个归档。
- 越出 `allowed_paths` 立即停止并重新路由，不扩大当前任务。

## 4. L1 / L2 / L3

- **L1（普通子任务）**：全仓 `npm test`、`npm run typecheck`、`npm run check:fullbleed`、`git diff --check`，并实际阅读 `git diff`。
- **L2（持久化高风险）**：数据迁移/持久化形状/备份恢复/鸡蛋原子扣除/章节 acknowledged 与完成日/启动写入自动升级；包含 L1，并运行 `backup.test.ts`、`migration.test.ts`、`farmPersistence.test.ts` legacy backup fixtures。
- **L3（构建集成）**：包含 L1，命中 L2 时同时包含 fixtures；普通任务不重复 build，由总控在最终 HEAD 上运行一次权威 build。

本任务没有修改数据与持久化，故不触发 L2；因为修改 `package.json`，实际等级为 **L3**。

## 5. Pages build 触发条件与 PWA 风险

改变以下任一项时，子任务必须执行 `GITHUB_PAGES=true npm run build`：`vite.config.*`、package/锁文件、`tsconfig*`、workflows、PWA/SW/manifest、`public/` 资产或清单、Pages base、构建守卫、动态导入/分包。

审查时重点确认：Workbox 单文件 3 MiB precache 上限；`globPatterns` 白名单是否包含新类型；本地 `/` 与 Pages `/pipienglish/` 的 base/scope/资产路径差异。本轮 Pages 构建生成 22 个 precache 条目（11,610.30 KiB），未出现 precache 超限警告；仅保留既存的 507.03 kB chunk 提示。

## 6. 只读 worktree 审计

预检时 `D:\Projects\pipienglish` 位于 `main@b4be9fcc71ac` 且干净，随后才创建本地 WIP 分支。其余 worktree 全程只读：

| worktree | HEAD | 状态条目 | 备注 |
|---|---:|---:|---|
| `080a` | `2602866a02aa` | 46 | detached；含 domain/application/UI 脏改动 |
| `0d6d` | `2602866a02aa` | 51 | detached；含 domain/application/UI 脏改动 |
| `2cd9` | `2602866a02aa` | 47 | detached；含 domain/application/UI 脏改动 |
| `3c42` | `2602866a02aa` | 9 | detached；抢救目标，仅只读复制指定范围 |
| `4a63` | `2602866a02aa` | 36 | detached；含 domain/application 脏改动 |
| `5a1e` | `2602866a02aa` | 20 | detached；以 domain 脏改动为主 |
| `9085` | `2602866a02aa` | 62 | detached；改动最多，含 UI/装扮草案 |
| `a39e` | `2602866a02aa` | 45 | detached；含 domain/application/UI 脏改动 |
| `a6fd` | `2602866a02aa` | 6 | detached；仅规格/架构与变更单脏改动 |
| `fe78` | `b4be9fcc71ac` | 0 | detached；干净 |

未对任何上述 worktree 执行 delete、prune、move、clean、reset、checkout 或写入。

## 7. Diff/stat 与验证结果

- 基线：`git merge-base --is-ancestor b4be9fcc71ac17616faffbba3e3800a92ac8d75b HEAD` → PASS。
- 许可路径：已跟踪、暂存、未跟踪三类合并核对，越界路径 `0`。
- diff/stat：已跟踪 5 文件 `+65/-299`；新增 5 份文档、530 行；合计 10 个许可路径文件。
- `npm test` → PASS，42 个测试文件、232/232 测试。
- `npm run typecheck` → PASS。
- `npm run check:fullbleed` → PASS，9 个样式表、617 条规则。
- `GITHUB_PAGES=true npm run build` → PASS，126 modules、22 precache entries；无 3 MiB 超限警告。
- `git diff --check` → PASS；新增文档另做尾随空白与末尾换行检查。

## Claude 审查清单

1. 路由是否仍包含所有任务的不可破坏核心，并且没有把视觉 PNG 带回代码/数据默认上下文。
2. L2 自动升级项和 legacy fixtures 是否覆盖迁移/恢复/原子扣除/章节日期风险。
3. L3 build 触发面是否完整，Pages base 与 PWA 风险是否写清。
4. 两个归档是否仅承接历史，活跃文档是否保留要求的章节。
5. 美术 9 项原创计数、机械缩略图、分层交付文件数和槽位计数是否与 §8.1 一致。
6. 确认本轮没有产品规格变更、儿童行为变更、候选 PNG 接入、worktree 清理、push 或部署。
