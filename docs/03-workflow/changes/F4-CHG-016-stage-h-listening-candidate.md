---
change_id: F4-CHG-016
date: 2026-07-17
stage: H-4
affected_state:
  - lesson_listening_ready
  - lesson_listening_correct
  - lesson_listening_retry
production_behavior_change: none
candidate_source:
  - design-samples/stage-h/listening-candidate.html
  - design-samples/stage-h/listening-candidate.css
  - design-samples/stage-h/listening-candidate.js
visual_after:
  - visual-regression/stage-h-candidates/H4A-listening-ready-v1-1194x834.png
  - visual-regression/stage-h-candidates/H4B-listening-correct-v1-1194x834.png
  - visual-regression/stage-h-candidates/H4C-listening-retry-v1-1194x834.png
approval: xiaopi-approved
approved_on: 2026-07-17
---

# H-4 听音题三状态视觉候选

听音题沿用 H-3 的四个大触控选项和温和反馈，但严格控制答案词形何时出现，避免把听力判断变成阅读判断。

## 共同规则

- H-4A 准备态和 H-4C 重试态只显示大音频入口与四个纯中文释义；不显示目标英文、音标或图片线索。
- 音频入口可重复点击；答错后仍留在本题，允许先重听再重选。
- 不使用 emoji、分数、倒计时、惩罚性文案或对应英文选项。

## 三个状态

- H-4A 准备态：“听一听，它是什么意思？”，顶部仅显示“播放单词”。
- H-4B 答对态：正确项绿色确认，此时才在音频区揭示 `egg /eɡ/`，用于完成后的听形绑定。
- H-4C 重试态：只标出本次错选，继续隐藏目标词形，避免重试时泄题。

候选只用于视觉审批，不接生产 TTS、课程状态、判分或导航。

## 审批结果

2026-07-17，小皮确认 H-4A/H-4B/H-4C V1 均没有问题，可按该三状态视觉接入生产。
