---
change_id: F4-CHG-015
date: 2026-07-17
stage: H-3
affected_state:
  - lesson_choice_ready
  - lesson_choice_correct
  - lesson_choice_retry
approval: xiaopi-approved
production_behavior_change: choice-screen-added
visual_before:
  - visual-regression/stage-h-candidates/H3A-choice-ready-v1-1194x834.png
  - visual-regression/stage-h-candidates/H3B-choice-correct-v1-1194x834.png
  - visual-regression/stage-h-candidates/H3C-choice-retry-v1-1194x834.png
visual_after:
  - visual-regression/stage-h-production/H3A-choice-ready-1194x834.png
  - visual-regression/stage-h-production/H3B-choice-correct-1194x834.png
  - visual-regression/stage-h-production/H3C-choice-retry-1194x834.png
---

# H-3 中文释义选择题生产接入

小皮批准三状态 V1 后，按批准稿实现正式 `LessonChoiceScreen`。当前通过开发查询参数独立验收；阶段 H 完整批准前不开放首页入口。

## 判定与事件边界

- 组件只使用稳定选项 id 做客观判定，画面只渲染中文 label；不会从选项 id 或题目词形派生英文提示。
- 每次选择都会通过 `onAnswer({ selectedId, correct })` 通知上层；答错队尾重考由 application 层负责，视觉组件不直接写数据库。
- 答错留在当前题，可重听并继续选择；答对后锁定四个选项，只有点击“继续”才触发 `onContinue`。

## 验证

- 1194×834 浏览器实测准备 → 答错 → 重听 → 答对 → 继续完整链路，控制台无错误。
- 纯函数覆盖稳定 id 判定、中文反馈取值与未知选项保护。
- 生产截图保存三种孩子可见状态，均未出现选项英文。
