---
change_id: F4-CHG-020
date: 2026-07-17
stage: H-5
affected_state:
  - lesson_dictation_ready
  - lesson_dictation_correct
  - lesson_dictation_retry
  - lesson_dictation_captured
production_behavior_change: approved H-5 dictation component and event bridge
source_after:
  - src/features/lesson-f4/LessonDictationScreen.tsx
  - src/features/lesson-f4/lessonDictationModel.ts
  - src/features/lesson-f4/lessonDictationModel.test.ts
  - src/styles/f4/lesson-dictation.css
visual_after:
  - visual-regression/stage-h-production/H5A-dictation-ready-v2-1194x834.png
  - visual-regression/stage-h-production/H5B-dictation-correct-v2-1194x834.png
  - visual-regression/stage-h-production/H5C-dictation-retry-v2-1194x834.png
  - visual-regression/stage-h-production/H5D-dictation-captured-v2-1194x834.png
approval: xiaopi-approved
---

# H-5 默写与小鸡被抓生产组件

- 标准文本输入框接收键盘或系统手写输入的最终英文；只归一首尾空白、Unicode 和大小写。
- 空输入不提交；错误输入保留并允许继续修改。只有正确态显示目标英文答案。
- 准备态与重试态均提供“想不起来”。点击后清空输入、进入被抓态并只发出一次 `onForgot({ wordId })`，组件不越层直接写 Dexie。
- 被抓态不渲染英文答案，向孩子说明错词入库和小鸡等待救援，并通过 `onCapturedContinue` 交回上层前进。
- application 层负责把 `onForgot` 映射到错题/救援事务；完整孩子可见学习导航仍等阶段 H 全部完成后统一接线。

## 验证

- 模型测试覆盖大小写/空白归一、正确/错误/空输入以及非正确态不预填答案。
- Playwright 实际点击“想不起来”后，`render_game_to_text` 返回 `answerVisible=false`、空输入、错题入队、小鸡被抓和 `listen/write/choose/dictate` 救援路线；控制台无新错误。
- 1194×834 的四个生产状态已逐张检查；全量自动测试 100/100 与生产构建通过。
