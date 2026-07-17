---
change_id: F4-CHG-014
date: 2026-07-17
stage: H-3
affected_state:
  - lesson_choice_ready
  - lesson_choice_correct
  - lesson_choice_retry
production_behavior_change: none
candidate_source:
  - design-samples/stage-h/choice-candidate.html
  - design-samples/stage-h/choice-candidate.css
  - design-samples/stage-h/choice-candidate.js
visual_after:
  - visual-regression/stage-h-candidates/H3A-choice-ready-v1-1194x834.png
  - visual-regression/stage-h-candidates/H3B-choice-correct-v1-1194x834.png
  - visual-regression/stage-h-candidates/H3C-choice-retry-v1-1194x834.png
approval: xiaopi-approved
approved_on: 2026-07-17
---

# H-3 中文释义选择题三状态视觉候选

选择题按孩子实际可见过程拆为准备、答对、答错重试三张图审批。候选使用 `egg`，只验证布局和反馈语法，不接生产导航、课程状态或真实判分。

## 共同规则

- 题目区显示英文单词与裸音频图标；点击整块可重听单词。
- 四个大触控选项只显示中文释义和 A–D 标记，不显示对应英文，避免直接泄露答案。
- 不使用 emoji、插图占位框、分数、星级或惩罚性文案。

## 三个状态

- H-3A 准备态：没有预选或颜色暗示，底部只提醒可以重听。
- H-3B 答对态：只将正确选项变绿，并给出“继续”按钮。
- H-3C 重试态：错选项使用低饱和粉色，明确“再选一次”；其余选项保持可选，提供重听入口。

## 本轮修正

首轮截图曾在每个中文选项下显示对应英文。爸爸指出这会泄题后，三张首轮图立即作废；V1 正式候选已全部删除选项英文，仅顶部保留题目单词。

## 审批结果

2026-07-17，小皮验收 H-3A/H-3B/H-3C V1 均没有问题，可按该三状态视觉接入生产。
