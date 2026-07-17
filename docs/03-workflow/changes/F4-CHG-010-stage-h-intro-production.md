---
change_id: F4-CHG-010
date: 2026-07-17
stage: H-1
affected_state:
  - lesson_intro_with_image
  - lesson_intro_without_image
production_behavior_change: isolated-component
approval_basis:
  - F4-CHG-008
  - F4-CHG-009
visual_after:
  - visual-regression/stage-h-production/H1A-egg-1194x834.png
  - visual-regression/stage-h-production/H1B-because-1194x834.png
approval: xiaopi-approved
---

# H-1 已批准听看卡生产接入

`LessonIntroScreen` 已按小皮批准的 H-1A V5 与 H-1B V4 实现为同一套生产组件。组件根据显式且已批准登记的 `imageAssetId` 选择有图版；缺失或未知资源进入无图文字版，禁止 emoji、破图和空白图片区回退。

## 已实现行为

- 初次进入自动朗读单词两遍，并在 500ms 后显示词形。
- “再听一次”播放当前单词。
- 整张例句卡可点击并播放英文例句；右侧只显示无圆框、无底色的音频波形。
- 进度、返回和“我认识它了”均提供正式事件接口。
- 复用 1194×834 `FarmStageShell`，保持当前 A2759 横屏适配边界。
- 提供 DEV 专用 `?lesson-intro=egg` / `?lesson-intro=because` 回归入口；生产首页导航尚未开放，待 H-2 及后续依赖画面批准后接成完整流程。

## 验证

- 两种模式均在 1194×834 应用浏览器内完成视觉检查。
- 单词重播与整句发音按钮完成点击回归，控制台无错误。
- 纯函数测试覆盖批准资产登记、无图回退、进度边界与双遍朗读文本。
