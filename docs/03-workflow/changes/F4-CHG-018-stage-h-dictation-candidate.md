---
change_id: F4-CHG-018
date: 2026-07-17
stage: H-5
affected_state:
  - lesson_dictation_ready
  - lesson_dictation_correct
  - lesson_dictation_retry
  - lesson_dictation_peek
production_behavior_change: none
candidate_source:
  - design-samples/stage-h/dictation-candidate.html
  - design-samples/stage-h/dictation-candidate.css
  - design-samples/stage-h/dictation-candidate.js
visual_after:
  - visual-regression/stage-h-candidates/H5A-dictation-ready-v1-1194x834.png
  - visual-regression/stage-h-candidates/H5B-dictation-correct-v1-1194x834.png
  - visual-regression/stage-h-candidates/H5C-dictation-retry-v1-1194x834.png
  - visual-regression/stage-h-candidates/H5D-dictation-peek-v1-1194x834.png
approval: pending-xiaopi
---

# H-5 英文默写题四状态视觉候选

H-5 按已落档的文本答案裁决设计：应用判断输入法最终提交的英文字符串，不识别键盘、普通电容笔或系统手写输入的来源，也不分析笔划。

## 输入规则

- 使用标准英文文本框，关闭自动完成、自动纠错、拼写检查与自动大写；键盘和系统手写输入共用同一个控件。
- 答案比较只归一首尾空白、Unicode 与英文大小写；候选用 `egg` 表达正确态、`hen` 表达错误态。
- 中文释义与重听常驻；准备态不显示目标英文。

## 四个状态

- H-5A 准备态：空文本框、重听、提交及“想不起来？看一眼”。
- H-5B 答对态：绿色答案框与继续按钮，移除重复的底部提交操作。
- H-5C 重试态：保留孩子本次输入，允许直接修改、重听、看答案或再次提交。
- H-5D 看答案态：短暂显示 `egg /eɡ/`，答案不自动写入输入框；点击“我记住了”后回到空框自行再写。

候选只用于视觉审批，不接生产输入、判定、课程状态或导航。
