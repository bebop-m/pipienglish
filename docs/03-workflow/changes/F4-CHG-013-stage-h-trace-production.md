---
change_id: F4-CHG-013
date: 2026-07-17
stage: H-2
affected_state:
  - lesson_trace_ready
  - lesson_trace_complete
approval: xiaopi-approved
production_behavior_change: trace-screen-added
visual_before:
  - visual-regression/stage-h-candidates/H2A-trace-ready-v1-1194x834.png
  - visual-regression/stage-h-candidates/H2B-trace-complete-v1-1194x834.png
visual_after:
  - visual-regression/stage-h-production/H2A-trace-ready-1194x834.png
  - visual-regression/stage-h-production/H2B-trace-complete-1194x834.png
---

# H-2 描红卡生产接入

小皮批准 H-2A/H-2B V1 后，按批准稿实现正式 `LessonTraceScreen`。当前仍通过开发查询参数独立验收，完整学习流批准前不开放首页入口。

## 输入与判定边界

- 画布统一使用标准 Pointer Events，支持普通电容笔、手指与鼠标；不识别设备品牌，不读取压感，不做 Apple Pencil 专属优化。
- 笔迹使用固定宽度粉色蜡笔线条，坐标从显示尺寸换算至 820×295 逻辑画布，保证缩放后路径一致。
- 描红只练习、不判分：不做 OCR、笔划顺序判断、相似度评分或对错反馈。
- 单点误触不能提交；至少形成一条有效短路径后才能进入完成态。

## 已实现行为

- 支持连续书写、指针捕获、立即清除、单词重听与空画布温和提示。
- 点击“写好了”后淡出字模、保留孩子笔迹，并显示“这是你的字”；完成过渡可被清除操作打断。
- 提供 `render_game_to_text` 与 `advanceTime` 供自动化回归。

## 验证

- 1194×834 浏览器实测初始态、普通触控路径、清除、空提交保护与完成态，控制台无错误。
- 纯函数覆盖坐标缩放、边界夹取、误触过滤和有效路径判断。
