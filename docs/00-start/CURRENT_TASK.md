# 当前任务门禁 · 2026-09-10 场景 2 完整衣柜上线

```yaml
task_id: ART-S2-WARDROBE-SHOP-LAUNCH-2026-09-10
base_commit: d94299048f02868baa5ff4a609db7360bb32409f
created_at: 2026-09-10T00:00:00+08:00
allowed_paths:
  - docs/00-start/CURRENT_TASK.md
  - docs/04-assets/CORE_ART_PRODUCTION_BOARD.md
  - public/assets/f4/asset-manifest.json
  - public/assets/f4/scenes/scene-2/travel-sign.png
  - public/assets/f4/scenes/scene-2/decorations/*.png
  - public/assets/f4/scenes/scene-2/cosmetics/*.png
  - scripts/qa-scene2-shop.mjs
  - scripts/qa-scene2-wardrobe.mjs
  - src/application/farmCustomization.test.ts
  - src/domain/farmCosmetics.ts
  - src/domain/farmCosmetics.test.ts
  - src/domain/farmScenes.test.ts
  - src/domain/farmScenes.ts
  - src/features/farm-f4/visual/characterAppearance.ts
  - src/features/farm-f4/visual/characterAppearance.test.ts
  - src/features/farm-f4/visual/FarmActors.tsx
  - src/features/farm-f4/visual/FarmCustomization.tsx
  - src/features/farm-f4/visual/FarmCustomization.test.ts
  - src/styles/f4/home.css
  - visual-regression/scene-2-shop-production/*
  - visual-regression/scene-2-wardrobe-production/*
validation_level: L3
required_docs:
  - docs/00-start/AI_START_HERE.md
  - docs/03-workflow/EXECUTION_BUDGET_POLICY.md
  - docs/04-assets/CORE_ART_PRODUCTION_BOARD.md
  - docs/05-architecture/F7_SCENE_STICKERS_WARDROBE_GATE_AND_TEST_PLAN.md
visual_references:
  asset_kind: character
  identity_reference:
    - public/assets/f4/scenes/scene-2/xiaopi.png
    - public/assets/f4/scenes/scene-2/mother.png
  style_reference:
    - C:/Users/86181/.codex/visualizations/2026/08/11/019ff196-03e8-7661-92d6-b9aa81d1311c/s2-wardrobe-g1/scene-2-wardrobe-g1-review-board-v1.png
  environment_reference:
    - public/assets/f4/scenes/scene-2/orchard-background.png
  composition_reference:
    - visual-regression/scene-2-wardrobe-production/scene-2-complete-shop-and-wardrobe-equipped-1194x834.png
  allowed_changes:
    - 将爸爸批准的 W01 至 W06 试装造型重建为完整可组合外观矩阵并复制到场景 2 生产目录
    - 上架小皮 4 件、母鸡 2 件共 80 蛋的收费衣柜商品
    - 让首页角色与衣柜预览按已装备槽位解析正确组合外观
    - 复用现有 cosmetics 所有权、扣蛋、装备、卸下和备份事务，不升级 IndexedDB schema
    - 新增真实购买、组合穿戴、刷新恢复与 GitHub Pages 子路径截图验收
  must_preserve:
    - W01 至 W06 已批准造型、角色身份、场景 2 免费默认造型与现有道具商店
    - 小皮发型/帽子造型互斥共用 headLook；outfit 与 accessory 可同时叠加；母鸡 headwear 与 neckwear 可同时生效
    - 六件价格依次 15、15、20、10、10、10，总价 80 蛋
    - 所有权永久、装备与卸下免费、重复购买不扣蛋、场景 1 仍显示自己的既有角色基准
forbidden_actions:
  - 让多个已装备槽位只显示最后一件或用 UI 状态冒充视觉组合
  - 修改角色脸、身份、道具商店价格、数据库 schema 或学习流程
  - 把 G1 棋盘格原图直接复制进生产目录
  - 提交、推送、外部部署、删除或覆盖用户已有内容
```

## 目标

爸爸于 2026-09-10 对 W01～W06 回复“没问题，上线吧”。本任务据此冻结六件造型并完成生产上线。由于当前场景 2 角色基准是压平整身图，直接叠加服装会露出原帽子、裙摆或围兜；本轮采用完整组合外观矩阵消费相同槽位语义，保证每种合法装备组合都有明确成品图，同时保留现有所有权和事务接口。后续若重建独立 body/outfit/headLook 层，可保持逻辑 ID 与存档不变地替换渲染实现。

## 开始任务前四问

1. **修改哪一层：**场景 2 衣柜生产图、商品定义、外观解析器、首页/衣柜渲染、测试和截图；不改数据库结构。
2. **参考与许可路径：**以 W01～W06 批准试装和场景 2 原角色为唯一身份/造型输入；组合补图只把已批准槽位放在同一角色上，不新增设计。
3. **规格契约：**全部生产图 `1254×1254 RGBA`；小皮保持 `252×274 pt` 角色框，母鸡保持 `220×220 pt`；矩阵覆盖小皮 12 种、母鸡 4 种合法组合。
4. **验证：**逐图检查 alpha、透明四角、身份和组合完整性；六件逐项真实购买共扣 80 蛋；组合装备后首页与衣柜同步、刷新恢复；运行完整测试、类型检查、视觉门禁、GitHub Pages L3 构建与子路径冒烟测试。
