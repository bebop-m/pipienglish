# 当前任务门禁 · 场景一／二冻结孵化素材接入完成

```yaml
task_id: SCENE-1-2-FROZEN-HATCHERY-INTEGRATION-2026-07-22
base_commit: fe4a4ac30a36ff82f36178407cbb5558cff50db6
created_at: 2026-07-22T14:45:00+08:00
allowed_paths:
  - docs/00-start/CURRENT_TASK.md
  - docs/02-visual/F4_VISUAL_SYSTEM.md
  - docs/04-assets/ASSET_BACKLOG_F4.md
  - progress.md
  - public/assets/f4/asset-manifest.json
  - public/assets/f4/chicks/**
  - public/assets/f4/scenes/**
  - src/application/**
  - src/domain/**
  - src/features/farm-f4/**
  - src/styles/f4/home.css
  - vite.config.ts
  - C:/Users/86181/.codex/visualizations/2026/07/22/019f8909-7034-7642-b3d2-844ebaeae431/**
validation_level: L3
required_docs:
  - docs/00-start/AI_START_HERE.md
  - docs/02-visual/F4_VISUAL_SYSTEM.md#94-所有新建场景的永久生产门禁
  - docs/05-architecture/F7_SCENE_STICKERS_WARDROBE_GATE_AND_TEST_PLAN.md
visual_references:
  asset_kind: character_variant
  identity_reference:
    - design-samples/assets/chick-f3.png
    - design-samples/assets/xiaopi-f3.png
    - design-samples/assets/mother-f3.png
  style_reference:
    - docs/reference-images/chick-character-style-reference.png
  environment_reference:
    - design-samples/assets/farm-background-f3.png
  composition_reference:
    - D:/Projects/pipienglish-recovery/2026-07-22-f4-stage-a-3c42/visual-regression/long-term-farm-stage-a/stage-a-orchard-overview-1194x834.png
  allowed_changes:
    - 冻结源文件的等比缩放、透明化、统一画布、脚底或地面锚点平移与机械分层摆放
  must_preserve:
    - 冻结主体的 RGB、造型、纹理、线条、批准配色和 F4 场景一可见轮廓比例
forbidden_actions:
  - 重新生成、重画、补画、概括或风格迁移任何已批准角色、小鸡、鸡窝、驿站
  - 使用生成式整图合成
  - 覆盖或混入任何现存用户改动
  - 发布场景二或将场景二资产加入当前 Service Worker 预缓存
  - 提交本任务范围外的并行脏改动
  - 部署
```

## 当前批准状态

- G1 候选定稿：已完成；仅使用爸爸指定的普通 F4、异色 B、特殊 F、小皮、母鸡 C、鸡窝 B、驿站 A 与苹果园构图参考。
- 场景二鸡窝状态源：爸爸最新指定的八格冻结矩阵是唯一像素来源，依次为 `空窝 → 完整蛋 → 细裂纹 → 大裂纹 → 两半蛋壳 → 普通破壳／异色破壳／特殊破壳`。逐格提取时只允许白底透明化、整格等比缩放、统一画布和地面锚点；不得替换或调整格内的蛋、裂纹、蛋壳、鸡窝或破壳结果。
- F4 鸡蛋模型退出本方案：场景二不再引用 `egg-f4-v2.png`，也不再引用此前独立制作的裂纹／蛋壳源；运行时只按 `incubating`、已批准的剩余时间分段和最终孵化结果整张切换八格派生贴图，不得现场叠蛋或重组状态。
- G2 独立校准：2026-07-22 爸爸在查看三鸡透明版、统一画布版和并排校准板后指示“继续我们的任务”，据此进入 G3。
- G3 整体校准：已批准 v5。场景一使用冻结红白篷车鸡窝状态组；场景一、二鸡窝整格显示尺寸均在 v4 基础上缩小 25%，特殊小鸡可见轮廓放大 20%，普通与异色小鸡尺寸不变。异色 B 与特殊 F 同时配置给场景一和场景二。
- G4 批量授权：已批准并完成。22 个冻结目标已逐文件复制到新生产路径并登记 SHA-256，没有覆盖旧资产；33 个清单资产最终复核全部匹配。
- 代码接入：已完成。两个场景均按业务状态整张切换八张鸡窝贴图；完整蛋 `>50%`、细裂纹 `20%–50%`、大裂纹 `≤20%`，两半蛋壳 `800ms`、结果贴图 `1500ms`。孵化前不读取或显示 rarity/variant。
- 倒计时：爸爸批准采用 2A“上字下线”；显示等待鸡蛋、小时／分钟、破壳中、新朋友，短进度线按 24 小时孵化周期实时推进。
- 场景二发布：未批准。场景二仍只在 `FUTURE_FARM_SCENE_DRAFTS`，不进入生产场景列表与当前 Service Worker 预缓存。
- 提交与推送：爸爸已于最终验收通过后明确批准本任务提交并推送；不包含场景二发布或部署。

## 验证边界

最终验收通过：空窝、10 小时、25 分钟、破壳中、新朋友五态的贴图、倒计时、进度线与 `render_game_to_text` 一致；1024×768 横屏正常，竖屏／过矮横屏按既有规则提示旋转或全屏。Vitest 45 个文件、251/251 通过，生产 PWA 构建与全屏视觉层守卫通过，Playwright 控制台 0 错误。验收材料位于仓库外 `final-hatchery-acceptance/`。
