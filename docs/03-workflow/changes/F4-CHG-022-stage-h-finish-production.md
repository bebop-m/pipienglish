---
change_id: F4-CHG-022
date: 2026-07-17
stage: H-6
affected_state:
  - lesson_finish_ready
  - lesson_finish_returning
production_behavior_change: approved-finish-screen-added
candidate_source:
  - design-samples/stage-h/finish-candidate.html
  - design-samples/stage-h/finish-candidate.css
visual_before:
  - visual-regression/stage-h-candidates/H6-finish-mother-thumbsup-v1-1194x834.png
visual_approved:
  - visual-regression/stage-h-candidates/H6-finish-mother-thumbsup-v2-1194x834.png
visual_after:
  - visual-regression/stage-h-production/H6-finish-mother-thumbsup-v2-1194x834.png
approval: xiaopi-approved
---

# H-6 母鸡妈妈课程结束页生产接入

小皮确认 H-6 框架后提出两项明确收口：移除框架顶部贴纸，聊天气泡黑线不得出现断层。V2 删除贴纸，并用单条闭合 SVG 路径绘制白色气泡与深色描边，随后获得小皮批准并转入正式组件。

## 正式行为

- `LessonFinishScreen` 使用 1194×834 固定逻辑舞台和已批准的母鸡妈妈透明 PNG。
- 战报显示新词、复习、连胜与鸡蛋奖励；输入值由纯函数归一化，异常值不会污染画面。
- 唯一孩子操作是“回农场”；点击后进入 `lesson_finish_returning` 并向上层发出 `onReturnFarm`。
- 视觉组件不直接写 Dexie、不自行发蛋，也不改变课程完成事务；这些行为留给阶段 H 整流集成中的 application 层。

## 验证

- H-6 模型定向测试 2/2、全量自动测试 102/102 通过。
- 1194×834 生产截图与 V2 批准稿一致。
- Playwright 验证初始态、回农场点击态与 `render_game_to_text`；控制台无错误。
- 生产构建通过。

> 协作提醒：Claude 尚未提交的 `docs/05-architecture/F4_STUDY_FLOW_PLAN.md` 仍含两处旧角色注释；Codex 未覆盖该共享工作，Claude 提交前需替换为母鸡妈妈结束页。
