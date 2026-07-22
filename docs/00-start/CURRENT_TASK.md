# 当前任务门禁 · F4 美术锚点路由修正

```yaml
task_id: F4-VISUAL-ROUTING-FIX-2026-07-22
base_commit: 49c10aeffff6769a155950abe959d7c4389d0546
created_at: 2026-07-22T11:12:19+08:00
allowed_paths:
  - docs/00-start/CURRENT_TASK.md
  - docs/00-start/AI_START_HERE.md
  - docs/02-visual/F4_VISUAL_SYSTEM.md
  - docs/03-workflow/changes/F4-CHG-029-f4-visual-anchor-routing.md
  - docs/04-assets/ASSET_BACKLOG_F4.md
validation_level: L1
required_docs:
  - docs/00-start/AI_START_HERE.md
  - docs/02-visual/F4_VISUAL_SYSTEM.md#9-独立图片制作协议
  - docs/02-visual/F4_BASELINE_MANIFEST.md
  - docs/04-assets/ASSET_BACKLOG_F4.md#生产与准入门禁
visual_references: not_applicable_documentation_only
forbidden_actions:
  - 修改任何 PNG、生产资产、哈希清单、运行时代码或儿童界面
  - 生成、批准、登记或接入第二场景候选资产
  - 修改第二场景主题或“当前章＋下一章”产品规则
  - 修改 allowed_paths 以外的仓库文件
  - 删除、prune、移动、清理或修改任何现存 worktree
  - reset、checkout 或丢弃用户改动
  - 将 WIP 合入 main、push 或部署
```

## 开工门禁

1. 确认当前分支为本地 `codex/wip-*`，且不是 `main`。
2. 执行 `git merge-base --is-ancestor 49c10aeffff6769a155950abe959d7c4389d0546 HEAD`；非零退出时立即停止。
3. 修改前后分别汇总已跟踪、暂存和未跟踪路径，并与 `allowed_paths` 逐项核对。
4. 一旦出现许可范围外路径，立即停止当前任务，不修补、不顺手整理；将越界工作重新路由到单独任务。
5. 若目标路径已有与本任务冲突的脏改动，停止并说明，不覆盖。

## 后续视觉任务必须填写的字段

任何生成或编辑图片的下一任务，都必须在重写本文件时用真实路径填写以下字段；不得写成“参考附件”或留空：

```yaml
visual_references:
  identity_reference: []
  style_reference: []
  environment_reference: []
  composition_reference: []
  allowed_changes: []
  must_preserve: []
```

开始生成前必须实际打开 `identity_reference` 和任务路由要求的最小锚图，并复述每张图的唯一职责。场景总览、界面截图和背景图默认只能进入 `environment_reference` 或 `composition_reference`；若身份锚图缺失或职责冲突，立即停止。

本任务只修复减负方案遗漏的美术锚点门禁并澄清 F4 贴图/小鸡变体口径，不改变任何已锁定资产或产品行为。
