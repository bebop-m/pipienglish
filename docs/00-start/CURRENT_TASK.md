# 当前任务门禁 · F4 视觉引用机检

```yaml
task_id: F4-VISUAL-REFERENCE-GATE-2026-07-22
base_commit: 66241dfd3bc17c47411d1307d79c2b53578dd1e2
created_at: 2026-07-22T11:21:46+08:00
allowed_paths:
  - docs/00-start/CURRENT_TASK.md
  - docs/03-workflow/EXECUTION_BUDGET_POLICY.md
  - package.json
  - scripts/check-visual-references.mjs
  - scripts/check-visual-references.test.mjs
validation_level: L3
required_docs:
  - docs/00-start/AI_START_HERE.md
  - docs/02-visual/F4_VISUAL_SYSTEM.md#9-独立图片制作协议
  - docs/03-workflow/EXECUTION_BUDGET_POLICY.md
visual_references: not_applicable_non_visual_task
forbidden_actions:
  - 修改任何 PNG、生产资产、哈希清单、运行时代码或儿童界面
  - 生成、批准、登记或接入候选资产
  - 修改产品规格、第二场景主题或“当前章＋下一章”规则
  - 修改 allowed_paths 以外的仓库文件
  - 删除、prune、移动、清理或修改任何现存 worktree
  - reset、checkout 或丢弃用户改动
  - 将 WIP 合入 main、push 或部署
```

## 开工门禁

1. 当前分支必须是本地 `codex/wip-*`，且不是 `main`。
2. 执行 `git merge-base --is-ancestor 66241dfd3bc17c47411d1307d79c2b53578dd1e2 HEAD`；非零退出立即停止。
3. 修改前后合并核对已跟踪、暂存和未跟踪路径；越出 `allowed_paths` 立即停止并重新路由。
4. 若目标路径已有冲突脏改动，停止说明，不覆盖。

## 后续视觉任务的机器可检字段

任何生成或编辑图片的后续任务，都必须把首个 YAML 块中的标量 `visual_references` 改成以下映射，并在生成前执行 `npm run check:visual-references`：

```yaml
visual_references:
  asset_kind: character_variant
  identity_reference:
    - design-samples/assets/chick-f3.png
  style_reference:
    - docs/reference-images/chick-character-style-reference.png
  environment_reference:
    - design-samples/assets/farm-background-f3.png
  composition_reference:
    - design-samples/sticker-f-farm-v4.html
  allowed_changes:
    - 羽毛配色
  must_preserve:
    - F4 家族比例与五官
```

`asset_kind` 可用值为 `character`、`character_variant`、`background`、`prop`、`ui`。角色类必须提供身份锚图；`character_variant` 必须提供非空 `allowed_changes`。所有四类参考都必须是磁盘上真实存在的文件路径。背景、场景总览和截图只进入 `environment_reference` 或 `composition_reference`，不得进入 `identity_reference` 或 `style_reference`；新背景的环境母图也填在环境槽。

只有确认不生成、不编辑、不评审图片的任务才可使用 `visual_references: not_applicable_non_visual_task`。本任务只实现门禁，不处理或改动任何图片。
