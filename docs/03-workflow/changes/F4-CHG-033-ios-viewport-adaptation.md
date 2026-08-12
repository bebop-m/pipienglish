---
change_id: F4-CHG-033
date: 2026-08-05
stage: stage-shell
affected_state: none
production_behavior_change: implemented
approval: dad-reported-issue-2026-08-05
independent_review: not-required
release_gate: full-suite-and-viewport-matrix
source_of_truth: docs/00-start/CURRENT_TASK.md
supersedes: none
---

# iOS 系列视口适配加固

爸爸报告 mini 真机「显示尺寸不对,有些贴图甚至看不到」,裁决把 iOS 系列屏幕自适应做通。1194×834 固定坐标系、唯一缩放公式、0.72 舒适阈值、竖屏与 iPhone 提示策略(2026-07-17 裁决)全部未动。

## 排查

对快进 Day 23 日常态跑 8 视口截图矩阵(`visual-regression/ios-adaptation-2026-08/`):mini 6/7 横屏、mini 5 4:3、Air、Pro 13、Safari 工具栏压缩态全部缩放正确、贴图齐全;竖屏与 iPhone 按裁决出引导卡。桌面模拟不能复现真机现象,但定位到两个 iOS 真机特有缺口。

## 修复

| 缺口 | 修复 |
|---|---|
| `apple-mobile-web-app-status-bar-style: default`:standalone 下 iOS 用不透明状态栏挤压布局,顶部一条色带、可用高度变小(mini 上 744→约 720,舞台整体再缩 3%) | 改 `black-translucent`,内容延伸到状态栏后面,`.f4-safe-area` 的 `env(safe-area-inset-*)` 负责避让 |
| `useStageScale` 只挂 ResizeObserver + orientationchange:iOS 对 `position:fixed` 容器在旋转、Safari 工具栏伸缩时有测量不触发/迟触发的已知时序问题,旋转后可能停留在错误缩放(观感即「尺寸不对/贴图被推出屏」) | 补 `window.resize` 与 `visualViewport.resize` 监听;`measure` 幂等,多触发无害 |

## 验证

- 完整测试 48 文件 269/269,`tsc --noEmit` 干净;
- 改动后重跑 8 视口矩阵,与改动前逐张一致(桌面无状态栏,第 2 项为纯兜底);
- 真机验证依赖爸爸 mini:更新 PWA 后旋转几次、开合工具栏确认尺寸即时回正。

## 遗留

- 若真机仍丢贴图,候选原因(需截图确诊):Safari 非 standalone 打开、弱网下 36MB 预缓存中断导致离线丢图、部分单词本无插图资产(政策内预期);
- iPhone 横屏 scale≈0.52 仍按裁决显示提示卡;若爸爸想让 iPhone 可用,需另签裁决(涉及 44pt 触控与 F4 保真取舍)。
