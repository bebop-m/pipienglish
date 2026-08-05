# 当前任务门禁 · 2026-08-05 家长页 v1(备份通道 + 设备快进)

```yaml
task_id: FEAT-PARENT-PAGE-V1-2026-08-05
base_commit: 6b07f413fc36a57afe31be965815b1f60d3a7422
created_at: 2026-08-05T00:00:00+08:00
allowed_paths:
  - docs/00-start/CURRENT_TASK.md
  - docs/03-workflow/changes/**
  - progress.md
  - src/App.tsx
  - src/domain/srs.ts
  - src/application/fastForward.ts
  - src/application/fastForward.test.ts
  - src/features/parent/**
validation_level: L2
required_docs:
  - docs/00-start/AI_START_HERE.md
  - docs/03-workflow/EXECUTION_BUDGET_POLICY.md
visual_references: not_applicable_non_visual_task
forbidden_actions:
  - 改动 src/styles/f4/** 与任何已批准 F4 视觉、资产、SHA-256 登记
  - 改动小皮可见界面(家长页入口按钮已存在,仅让其导航生效)
  - 删除或清理 worktree
  - 未经爸爸明确批准不得推送 main 或部署
```

## 本批次来源

小皮的 iPad Pro 送修,临时改用 iPad mini。爸爸裁决(2026-08-05 对话):

1. 落地家长页 v1:入口门控、一键导出/导入 JSON(SPEC §6 数据安全 2026-07-17 已裁决)、连胜日期查看、鸡蛋数量修改;
2. 新增「快进到 Day N」工具:在 mini 上模拟出 N 天按计划全对完成的历史,让学习习惯不断档。每天学习计划固定(词库投放顺序 ×4/天),故已学词集合可精确推导;蛋库存与小鸡数量不可推导,由爸爸手动输入;FSRS 复习节奏按全对近似。
3. 已知取舍(爸爸知情):快进后 mini 与 Pro 存档分叉,导入为整档覆盖、无合并;Pro 修回后不再导回,mini 升为主力机。描红笔迹、救援队列、贴纸装扮不随快进恢复。

## 分项

| 顺序 | 分项 | 负责人 | 级别 | 主要路径 | 状态 |
|---:|---|---|---|---|---|
| 1 | srs 可注入时钟(向后兼容) | Claude | L1 | `srs.ts` | **完成** |
| 2 | 快进模拟用例 + 测试 | Claude | **L2** | `fastForward.ts` | **完成** |
| 3 | 家长页 UI(朴素)+ 路由放开 | Claude | L1 | `features/parent/**`、`App.tsx` | **完成** |
| 4 | 门禁与变更记录 | Claude | L1 | `CURRENT_TASK.md`、`F4-CHG-032`、`progress.md` | **完成** |

## 为什么是 L2

快进会整档重建 cards/sessions/kv/chicks/seen,与备份导入共用清库-重建路径;按 `EXECUTION_BUDGET_POLICY.md` §L2 必须附带跑 legacy backup fixtures,并对模拟历史(连胜、蛋数、会话日期、FSRS 排程单调性)有目标测试。

## 发布授权

- 2026-08-05,爸爸明确批准:提交并推送 `main`,允许本批次触发 GitHub Pages 部署(原话「推送同步吧」)。
