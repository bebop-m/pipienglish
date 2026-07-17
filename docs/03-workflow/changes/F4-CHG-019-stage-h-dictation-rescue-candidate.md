---
change_id: F4-CHG-019
date: 2026-07-17
stage: H-5
affected_state:
  - lesson_dictation_ready
  - lesson_dictation_correct
  - lesson_dictation_retry
  - lesson_dictation_captured
production_behavior_change: none
candidate_source:
  - design-samples/stage-h/dictation-candidate.html
  - design-samples/stage-h/dictation-candidate.css
  - design-samples/stage-h/dictation-candidate.js
visual_after:
  - visual-regression/stage-h-candidates/H5A-dictation-ready-v2-1194x834.png
  - visual-regression/stage-h-candidates/H5B-dictation-correct-v2-1194x834.png
  - visual-regression/stage-h-candidates/H5C-dictation-retry-v2-1194x834.png
  - visual-regression/stage-h-candidates/H5D-dictation-captured-v2-1194x834.png
approval: pending-xiaopi
---

# H-5 默写与小鸡救援 V2 视觉候选

H-5 V2 废弃全部“看一眼答案”入口。孩子在准备态或答错重试态点击“想不起来”时，不显示目标英文、音标或任何答案提示，而是立即跳过本题。

## 孩子可见规则

- 准备态与重试态都提供简洁的“想不起来”，不使用带问号的提示文案。
- 点击后显示一次“小鸡被抓走了”结果：该词进入错题库，一只小鸡进入等待救援状态；随后可继续下一题。
- 救援时只处理这一道错词，单独依次重走“听、写、选、默”四段新学路线。
- 四段全部通过后，该词才从错题库移除，同时一只对应的小鸡回到农场。
- 任一段未通过时，错题记录和被抓小鸡都保留，等待下一次救援；不得只完成一部分就提前移除。

## 后续生产事件契约

- `skip_unknown`：原子地将当前词加入错题/救援队列、记录一只小鸡被抓，并前进到下一题。
- `rescue_completed`：仅在 `listen`、`write`、`choose`、`dictate` 四段全部通过后，原子地移除该词错题记录并归还一只小鸡。
- `rescue_incomplete`：不移除错题、不归还小鸡。
- 跳过和被抓结果画面均不得把正确英文写入 DOM、输入框或无障碍标签，避免答案泄露。

本轮仍是视觉候选，不接生产数据库、课程状态、真实判定或首页小鸡数量；小皮批准后再实现上述持久化和原子事务。
