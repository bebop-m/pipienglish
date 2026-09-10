# 当前任务门禁 · 2026-09-11 学习节奏重定 + iPad A16 反馈修复 + 资产瘦身

```yaml
task_id: RULES-IPAD-ASSETS-2026-09-11
base_commit: 147ba31
created_at: 2026-09-11T00:00:00+08:00
allowed_paths:
  - docs/**
  - progress.md
  - package.json
  - vite.config.ts
  - .github/workflows/deploy.yml
  - scripts/optimize-f4-assets.py
  - scripts/qa-scene2-shop.mjs
  - scripts/qa-scene2-wardrobe.mjs
  - src/**
  - public/assets/f4/**
  - design-samples/assets/f4-production-masters/**
validation_level: L3
required_docs:
  - docs/00-start/AI_START_HERE.md
  - docs/03-workflow/EXECUTION_BUDGET_POLICY.md
  - docs/03-workflow/changes/F4-CHG-034-review-spelling-daily-rhythm-streak-shield.md
  - docs/03-workflow/changes/F4-CHG-035-ipad-a16-fixes-and-asset-diet.md
visual_references: not_applicable_non_visual_task
forbidden_actions:
  - 修改任何母版 PNG 的像素;母版只读,生产 WebP 由脚本派生
  - 改变 1194×834 舞台坐标系、已批准视觉布局或角色身份
  - 删除、覆盖或清理用户 worktree
```

## 目标

爸爸 2026-09-10 在小皮 iPad A16 的真机反馈后裁决:复习全部拼写、每日 2 新词 + 12 复习、连胜守护卡、必修 1 颗蛋(F4-CHG-034);并把审查清单里的 bug 与优化一并实施、自查后推送上线(F4-CHG-035)。

## 开始任务前四问

1. **修改哪一层:**领域规则(dailyPlan / lesson / streak / eggEconomy)、应用层(viewmodel / usecases / fastForward / migration)、首页与家长页 UI 文案与容器、BGM 播放器、样式(touch-callout、画布底色、家长页滚动)、构建与 CI 配置、生产素材派生。
2. **参考与许可路径:**见 allowed_paths;母版 PNG 移入 `design-samples/assets/f4-production-masters/` 只读,不改像素。
3. **规格契约:**assetId 沿用 `.png` 逻辑 ID,`assetUrl.ts` 统一映射 `.webp`;`MetaState.freezeCards` 旧记录缺省 0;`DailySession.newWordsPaused` 保留读兼容不再写入。
4. **验证:**`npm test`、`npm run typecheck`、`npm run check`、`npm run assets:check`、`GITHUB_PAGES=true npm run build`、浏览器实测(装饰 keep-out、衣柜、完成卡守护卡、家长页滚动与诊断面板)。
