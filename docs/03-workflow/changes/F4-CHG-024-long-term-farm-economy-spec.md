---
change_id: F4-CHG-024
date: 2026-07-19
stage: long-term-farm-spec
affected_state:
  - egg_economy
  - hatchery
  - chick_rarity
  - farm_scene
  - coop_and_favorites
  - kitchen
  - decorations
  - wardrobe
  - backup_migration
production_behavior_change: not-yet-implemented
approval: dad-final-approved
independent_review: claude-unconditional-pass
release_gate: domain-tests-and-v3-migration-required
source_of_truth: docs/01-product/FARM_LONG_TERM_ECONOMY_PROPOSAL.md
---

# 36 日长期农场与鸡蛋经济最终裁决

本变更记录确认产品方向和跨文档规格已经锁定，但**不声明生产代码已实现**。最终裁决版已经过爸爸拍板、Claude 两轮一致性验收，并于 2026-07-19 获得无条件通过。

## 正式裁决

- 每 36 个完成日解锁一个章节场景；庆祝后由小皮选择出发或继续停留，旧场景永久可回访。
- 每日必修固定 2 颗鸡蛋；写词游戏每日前 10 轮各 1 颗，之后纯加练。
- 孵化棚改为单巢，原子扣 1 蛋，固定 24 小时，常驻友好剩余时间，每颗蛋必出一只小鸡。
- 稀有度固定为普通 83%、异色 15%、特殊 2%，带连续 10 次至少异色和连续 36 次必特殊的隐藏保底；结果在放蛋时确定。
- 每场景最多显示 40 只，小皮可自主选择最多 8 只“最喜欢”；其余进入可交互鸡舍，资产不丢失。
- 场景内容分核心包与扩展包。核心包必须随离线应用按时交付，并始终预置未来两章；扩展包可晚到且永久可买。
- 生鸡蛋可制作 1 蛋单份煎蛋、5 蛋野餐餐盘、20 蛋庆典大餐；只有情感动画与首次章节合照，无数值收益。
- 场景贴纸绑定场景；小皮三槽、母鸡两槽装扮全局拥有。第一版角色装扮只渲染于农场首页与衣柜。
- 所有旧小鸡迁入场景 1；三巢旧蛋只保留最早一颗，其余完整退款。迁移、缺勤、内容脱期和旅行均不得造成资产损失。

## 经济闭合

- 36 日必修收入 72 颗，游戏理论上限 360 颗。
- 每天孵化一次消耗 36 颗；只做必修仍可留下约 36 颗自由蛋。
- 完整章节场景贴纸 90 颗，角色装扮 80 颗，合计 170 颗。
- 扣除必修自由蛋后，还需 134 颗游戏蛋，平均约 3.72 轮/完成日；买齐不是通关条件。

## 已同步文档

- `docs/01-product/SPEC.md`
- `docs/05-architecture/F4_HOME_ARCHITECTURE_PLAN.md`
- `docs/01-product/DESIGN_BRIEF.md`
- `docs/04-assets/ASSET_BACKLOG_F4.md`
- `docs/01-product/FARM_LONG_TERM_ECONOMY_PROPOSAL.md`

## 实施门槛

1. 纯领域规则与边界测试先通过。
2. Dexie v3 迁移及 v1/v2/v3 备份导入证明零损失。
3. 单巢、分层角色、三类小鸡和三层贴纸完成美术技术原型验收。
4. 再依次接入当前农场闭环、章节地图、贴纸与衣柜。

在上述门槛完成前，现行 1 蛋、5 轮、三巢代码属于待迁移的旧生产行为，不能反向覆盖本变更记录。
