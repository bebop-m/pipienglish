---
change_id: F4-CHG-021
date: 2026-07-17
stage: H-6
affected_state:
  - lesson_finish_ready
  - lesson_finish_returning
production_behavior_change: none
candidate_source:
  - design-samples/stage-h/finish-candidate.html
  - design-samples/stage-h/finish-candidate.css
  - design-samples/stage-h/finish-candidate.js
approved_asset:
  - design-samples/assets/mother-thumbsup-f4-v1-chroma.png
  - design-samples/assets/mother-thumbsup-f4-v1.png
  - public/assets/f4/mother-thumbsup-f4-v1.png
visual_after:
  - visual-regression/stage-h-candidates/H6-finish-mother-thumbsup-v1-1194x834.png
approval: pending-xiaopi
---

# H-6 母鸡妈妈课程结束页候选

小皮否决屁股超人后，结束页庆祝角色改为母鸡妈妈。新动作保持既有母鸡身份与水粉画风，竖起清晰的大拇指；小皮已单独批准该角色资产。

## 页面内容

- 母鸡妈妈使用页面文字气泡说“真棒！”，不把中文烧进 PNG。
- 战报只显示孩子需要看到的三项：认识 4 个新朋友、复习 6 个老朋友、连续学习 3 天。
- 奖励条显示新鸡蛋 `+1`，并说明回到农场即可看到。
- 唯一主操作为“回农场”；点击后的候选状态为 `lesson_finish_returning`。
- 页面继续使用 1194×834 逻辑舞台与 A2759 横屏基线，未接生产完成事务或孩子可见导航。

## 资产处理

- 生成母版保存在 `design-samples/assets/mother-thumbsup-f4-v1-chroma.png`。
- 透明批准版和 public 副本字节一致，SHA-256 为 `EBCFBB1898BEF2D31D5E0B2C8F2A2CFE1F35803DCD6DE0AE633B56CC6DF004C3`。
- 透明角、主体覆盖与去绿边检查通过；对话气泡、星光和阴影均由页面绘制。

Playwright 已验证初始态、回农场点击态、`render_game_to_text` 和控制台；候选仍需小皮确认整页排版后才能接入 `src/`。

> 协作提醒：Claude 尚未提交的 `docs/05-architecture/F4_STUDY_FLOW_PLAN.md` 仍含两处旧角色注释；Codex 未覆盖该共享工作，Claude 提交前需将其替换为母鸡妈妈结束页。
