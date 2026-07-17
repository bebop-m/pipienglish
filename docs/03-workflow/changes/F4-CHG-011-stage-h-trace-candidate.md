---
change_id: F4-CHG-011
date: 2026-07-17
stage: H-2
affected_state:
  - lesson_trace_ready
  - lesson_trace_complete
production_behavior_change: none
candidate_source:
  - design-samples/stage-h/trace-candidate.html
  - design-samples/stage-h/trace-candidate.css
  - design-samples/stage-h/trace-candidate.js
visual_after:
  - visual-regression/stage-h-candidates/H2A-trace-ready-v1-1194x834.png
  - visual-regression/stage-h-candidates/H2B-trace-complete-v1-1194x834.png
assets:
  - public/assets/f4/mother-f3.png
  - public/assets/f4/farm-background-f3.png
approval: pending-xiaopi
---

# H-2 描红卡双状态视觉候选

本候选把孩子可见的描红过程拆成两张图审批，避免只确认空白练习框而遗漏完成反馈。

## H-2A · 准备描红

- 示例词为 `egg`，顶部进度进入新朋友第 2/3 步、今日 4/18。
- 中央为四线三格与超大淡灰字模；画布覆盖在线格与字模上方。
- 常驻“重听”“清除重写”“写好了”三个操作，主要触控按钮高度不低于 50px。
- 文案明确“只写一遍”“这里不打分”，避免练字压力。

## H-2B · 描红完成

- 示例粉色字迹仅用于表达完成态构图，不代表小皮实际字迹。
- 完成后字模淡到接近不可见，保留孩子自己的笔迹与“这是你的字”提示。
- 不显示分数、对错、星级或 OCR 结果；仍可清除重写。

## 交互原型边界

- 候选画布使用 Pointer Events、`setPointerCapture` 与 `touch-action: none`，笔和手指均可直接描写。
- 落笔即时显示，清除立即复原；没有任何笔迹时不能进入完成态，只给手写区一个短暂温和高亮。
- 提供 `render_game_to_text` 和 `advanceTime` 测试接口；候选不接真实课程、字迹数据库或生产导航。
