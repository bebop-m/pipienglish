# 当前任务门禁 · 2026-08-05 iOS 系列屏幕自适应加固

```yaml
task_id: FIX-IOS-VIEWPORT-ADAPTATION-2026-08-05
base_commit: 10d3beff48816c088b3709481da98dd11911926a
created_at: 2026-08-05T18:00:00+08:00
allowed_paths:
  - docs/00-start/CURRENT_TASK.md
  - docs/03-workflow/changes/**
  - progress.md
  - index.html
  - src/features/farm-f4/stage/useStageScale.ts
  - visual-regression/ios-adaptation-2026-08/**
validation_level: L1
required_docs:
  - docs/00-start/AI_START_HERE.md
  - docs/02-visual/F4_IPAD_FIDELITY.md
visual_references: not_applicable_non_visual_task
forbidden_actions:
  - 改动 1194×834 固定舞台坐标系与唯一缩放公式(FIDELITY §3)
  - 改动 MIN_COMFORT_SCALE 门槛与竖屏/iPhone 提示策略(2026-07-17 裁决:iPhone 与竖屏另行设计)
  - 改动任何 F4 视觉资产、样式 token 或儿童可见文案
  - 未经爸爸明确批准不得推送 main 或部署
```

## 本批次来源

爸爸报告(2026-08-05):mini 真机上「显示尺寸不对,有些贴图甚至看不到」,裁决把 iOS 系列屏幕自适应做通。

排查结论:桌面模拟 iPad mini 6/7 横屏(1133×744)、mini 5 4:3(1024×768)、Air(1180×820)、Pro 13(1366×1024)、Safari 工具栏压缩(1133×650)下固定舞台缩放、贴图可见性全部正常(截图矩阵见 `visual-regression/ios-adaptation-2026-08/`);竖屏与 iPhone 横屏按既定裁决显示引导卡。模拟无法复现真机现象,但存在两个可坐实的 iOS 真机特有缺口,本批次修复:

1. `apple-mobile-web-app-status-bar-style: default` → standalone 下顶部有不透明状态栏挤压可用高度且顶部出现色条;改 `black-translucent` 让舞台用满屏幕(safe-area 已由 `.f4-safe-area` 处理)。
2. `useStageScale` 只依赖 ResizeObserver + orientationchange;iOS 对 `position:fixed` 容器在旋转/Safari 工具栏伸缩时存在测量时序问题,补 `window.resize` 与 `visualViewport.resize` 监听兜底,任何视口变化都即时重算缩放。

## 分项

| 顺序 | 分项 | 负责人 | 级别 | 主要路径 | 状态 |
|---:|---|---|---|---|---|
| 1 | 状态栏沉浸 | Claude | L1 | `index.html` | 待做 |
| 2 | 视口变化重算兜底 | Claude | L1 | `useStageScale.ts` | 待做 |
| 3 | iOS 视口截图矩阵存档 | Claude | L1 | `visual-regression/ios-adaptation-2026-08/**` | 待做 |
| 4 | 门禁与变更记录 | Claude | L1 | `CURRENT_TASK.md`、`F4-CHG-033`、`progress.md` | 待做 |

## 真机确诊待办

若修复发布后 mini 真机仍有「贴图看不到」,需要爸爸提供一张真机截图与打开方式(主屏图标还是 Safari)再定位;候选原因:Safari 非 standalone 工具栏压缩、弱网下 36MB 预缓存中断导致离线丢图、部分单词无插图资产(F4_WORD_ILLUSTRATION_POLICY 属预期)。

## 发布授权

- 2026-08-05,爸爸明确批准:提交并推送 `main`,允许本批次触发 GitHub Pages 部署(原话「先合并推送这一版」)。
