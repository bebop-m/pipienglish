# AI 任务入口 · 皮皮 English F4

任何 AI 在修改架构、页面或图片前，先完整阅读本页指定的材料。不要只读一个模糊的“日系贴纸风”提示词开始工作。

## 必读顺序

1. [`../01-product/SPEC.md`](../01-product/SPEC.md) —— 产品规则、状态和数据；
2. [`../01-product/DESIGN_BRIEF.md`](../01-product/DESIGN_BRIEF.md) —— 页面与情感基调；
3. [`../02-visual/F4_VISUAL_SYSTEM.md`](../02-visual/F4_VISUAL_SYSTEM.md) —— F4 精确画风、资产语法和新图片协议；
4. [`../02-visual/F4_IPAD_FIDELITY.md`](../02-visual/F4_IPAD_FIDELITY.md) —— 1194×834 固定舞台、PWA 和视觉回归；
5. [`../02-visual/F4_BASELINE_MANIFEST.md`](../02-visual/F4_BASELINE_MANIFEST.md) —— 已确认文件、图片尺寸和哈希；
6. [`../03-workflow/CLAUDE_CODEX_VISUAL_CONTRACT.md`](../03-workflow/CLAUDE_CODEX_VISUAL_CONTRACT.md) —— 架构与视觉职责边界；
7. [`../04-assets/ASSET_BACKLOG_F4.md`](../04-assets/ASSET_BACKLOG_F4.md) —— 后续独立图片清单；
8. [`../reference-images/README.md`](../reference-images/README.md) —— 小皮确认的两张原始视觉参考图。

随后实际打开：

- [`../../design-samples/sticker-f-farm-v4.html`](../../design-samples/sticker-f-farm-v4.html)；
- [`../../design-samples/assets/farm-background-f3.png`](../../design-samples/assets/farm-background-f3.png)；
- [`../../design-samples/assets/chick-f3.png`](../../design-samples/assets/chick-f3.png)；
- [`../reference-images/chick-character-style-reference.png`](../reference-images/chick-character-style-reference.png)；
- [`../reference-images/pwa-icon-farm-master.png`](../reference-images/pwa-icon-farm-master.png)；
- 当前任务涉及的对应角色或物件原图。

## 固定共识

- F4 已由小皮确认，不再重新探索整体风格。
- “贴纸”指画风、独立透明素材和视觉层级，不指统一白边或贴纸收集册布局。
- 生产页面不是整张截图：背景/场景、独立物件、可动角色和 HTML/CSS UI 必须分层。
- 1194×834 是不可重排的核心坐标系；其他 iPad Pro 横屏只整体等比缩放并延展外围背景。
- 母版文件不可覆盖；新增和修订使用新文件名、新版本和新哈希。
- Claude 负责架构、数据、状态和接口；Codex 负责视觉、资产、布局、动效、iPad 保真和视觉回归。

## 发给 Claude 的开场指令

> 先完整阅读 `docs/00-start/AI_START_HERE.md` 及其中列出的全部必读文档，并校验/查看 F4 母版。F4 已由小皮确认，你本轮只负责产品内部架构和方案规划：模块边界、领域模型、页面状态机、TypeScript 接口、事件、副作用、Dexie 数据迁移、离线与错误恢复、测试边界。不要生成或重设计视觉稿，不要修改 F4 Token、尺寸、布局、动效和图片，不要把任何真实 F4 资产换成字符图标、通用矢量图、组件库或占位素材。所有界面坐标以 1194×834 逻辑坐标表达。输出需符合 `docs/03-workflow/CLAUDE_CODEX_VISUAL_CONTRACT.md` §4，列出需要 Codex 实现的 ViewModel、事件和仍待视觉确认的状态；若架构冲动会改变已确认视觉，先说明冲突并停止该部分。

## 发给视觉生成 AI 的开场指令

> 本轮不是自由创作。先读取 `docs/02-visual/F4_VISUAL_SYSTEM.md` 和 `docs/reference-images/README.md`，明确我提供的每张图片分别是身份参考、画风参考、环境参考还是构图参考。只制作结构化需求单指定的一个独立资产，保持现有 F4 角色身份、线条、配色、材质、透明画布和锚点。不要输出界面截图，不要增加白色贴纸边、背景、文字、阴影或装饰粒子。生成结果必须经过视觉系统 §10 验收后才能接入项目。

## 开始任务前必须回答的四句话

1. 本任务修改哪一层（背景、场景物件、角色、UI、架构）？
2. 哪些 F4 文件/资产是直接参考，哪些不可修改？
3. 输出使用什么逻辑尺寸、画布和锚点？
4. 用什么截图、哈希或交互测试证明没有破坏 F4？

答不清以上四项时，不开始生成或改代码。
