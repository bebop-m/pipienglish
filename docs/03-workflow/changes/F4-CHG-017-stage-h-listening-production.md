---
change_id: F4-CHG-017
date: 2026-07-17
stage: H-4
affected_state:
  - lesson_listening_ready
  - lesson_listening_correct
  - lesson_listening_retry
approval: xiaopi-approved
production_behavior_change: listening-screen-added
visual_before:
  - visual-regression/stage-h-candidates/H4A-listening-ready-v1-1194x834.png
  - visual-regression/stage-h-candidates/H4B-listening-correct-v1-1194x834.png
  - visual-regression/stage-h-candidates/H4C-listening-retry-v1-1194x834.png
visual_after:
  - visual-regression/stage-h-production/H4A-listening-ready-1194x834.png
  - visual-regression/stage-h-production/H4B-listening-correct-1194x834.png
  - visual-regression/stage-h-production/H4C-listening-retry-1194x834.png
---

# H-4 听音题生产接入

小皮批准三状态 V1 后，按批准稿实现正式 `LessonListeningScreen`。阶段 H 完整批准前仍只通过开发查询参数验收。

## 防泄题边界

- 进入题目后自动播放一次目标单词，也可点击大音频入口重复播放。
- 准备态和答错重试态不渲染目标英文或音标节点；不仅是视觉隐藏，因此页面文本和辅助技术同样无法读到答案词形。
- 只有答对后才渲染词形与音标，完成听音到词形的强化绑定。

## 判定与事件

- 复用稳定选项 id 客观判定；四个选项只渲染中文 label。
- 答错保持本题并允许重听重选；答对锁定选项，点击继续后才交给上层导航。
- 每次作答通过事件桥交给 application 层，视觉组件不直接写队尾或数据库。

## 验证

- 自动测试覆盖 ready/retry 隐藏、correct 揭示的显示边界。
- 1194×834 浏览器实测准备 → 答错 → 重听 → 答对 → 继续，三个状态页面文本和控制台均符合预期。
