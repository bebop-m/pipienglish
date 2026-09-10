# F4 核心美术生产看板

> 建立日期：2026-08-12
> 当前范围：补齐已发布场景 1、2 的核心包例外，并建立后续动作帧与扩展包队列。
> 当前阶段：**场景 1 暂停；场景 2 全道具与完整衣柜均已完成 G1–G4，并接入商店。**
> 当前批次例外：爸爸先批准场景 2 全部道具，后于 2026-09-10 对 W01～W06 回复“没问题，上线吧”；两批均已完成生产资产、目录、事务、实景和 Pages 子路径验收。

## 1. 当前判断

工程框架已经能消费贴纸、装扮和章节内容，但正式美术内容仍是瓶颈：

- `FARM_SCENE_DEFINITIONS` 已发布场景 1、2；场景 2 的免费路牌及 9 件收费贴纸已经生产，场景 1 贴纸继续暂停。
- 场景 2 的小皮 4 件、母鸡 2 件装扮已经生产并进入 `FARM_COSMETIC_DEFINITIONS`，总价 80 蛋；场景 1 衣柜仍未生产。
- 两个场景共用同一款已批准异色小鸡和同一款已批准特殊小鸡；每章“2 异色 + 1 特殊”的主题款式池尚未形成。
- 正式清单有 57 个文件，其中包含场景 2 的 10 件道具图与 14 张衣装组合图；孵化、装饰和换装深度已经具备，角色动作与章节小鸡款式仍待后续。

因此先完成“孩子能看见且现有系统能直接消费”的核心内容，再做动作帧、学习配套和扩展目录。

## 2. 状态与门禁

| 状态 | 含义 |
|---|---|
| `NEXT_CALIBRATION` | 当前唯一允许准备 G1 候选的资产 |
| `QUEUED` | 需求已建单，但不得生成候选 |
| `NEEDS_PRODUCT_DECISION` | 逻辑槽存在，主题、造型或命名尚未由爸爸/小皮确定 |
| `G1_REVIEW` | 具体候选与技术风险已登记，等待人工选择或退回 |
| `G1_APPROVED` | 具体候选已批准并冻结源文件与 SHA-256 |
| `G2_REVIEW` | 透明版、统一画布和实际尺寸校准板已完成，等待人工批准 |
| `G2_APPROVED` | 透明、画布、bbox、scale、anchor 独立校准已批准 |
| `G3_REVIEW` | 冻结像素的目标背景机械合成已完成，等待人工批准 |
| `G3_APPROVED` | 冻结像素在目标背景上的机械合成已批准 |
| `G4_REVIEW` | 最终文件清单、参数、生产目标与回退点已冻结，等待批量授权 |
| `G4_AUTHORIZED` | 最终文件清单与参数获批，可开始限定批量生产 |
| `BATCH_READY` | 单件已通过 G1–G3，保留在仓库外等待所属场景整包齐套 |
| `PRODUCTION_REGISTERED` | 每个文件已验收、登记、接入并通过生产回归 |

批准必须针对具体材料。`G1` 不包含 `G2`，`G2` 不包含 `G3`，`G3` 不包含 `G4`；没有明确答复一律视为未批准。

## 3. 规格注册表

### 3.1 场景贴纸

以下数值来自 `src/domain/farmScenes.ts`，生产接入前不得漂移。

| 规格代号 | 类型 | 源画布 | display box | ground anchor | 允许摆放范围 | 默认层 |
|---|---|---:|---:|---:|---:|---|
| `DEC-S` | small | 1254×1254 RGBA | 104×82 pt | (631, 928) | x 40–1154；y 560–810 | 按目录项 |
| `DEC-M` | medium | 1254×1254 RGBA | 205×138 pt | (629, 980) | x 120–1074；y 500–800 | 按目录项 |
| `DEC-L` | landmark | 1254×1254 RGBA | 330×300 pt | (636, 1145) | x 240–954；y 390–700 | 按目录项 |

通用要求：独立透明贴图、sRGB、无烘焙文字/数量/气泡/投影、无统一白边；主体不得画进背景。每件贴纸的 `back/actor/front` 必须与目录定义一致。

### 3.2 角色与装扮

| 规格代号 | 目标 | 源画布 | display box | foot anchor | 直接身份基准 |
|---|---|---:|---:|---:|---|
| `CHAR-X` | 小皮 | 1254×1254 RGBA | 252×274 pt | (627, 1104) | `design-samples/assets/xiaopi-f3.png` |
| `CHAR-M` | 母鸡 | 1254×1254 RGBA | 220×220 pt | (622, 1058) | `design-samples/assets/mother-f3.png` |
| `CHAR-C` | 小鸡 | 1254×1254 RGBA | 116×116 pt | 继承 `chick-f3` 脚底基线，G2 测量冻结 | `design-samples/assets/chick-f3.png` |

装扮层必须与目标角色使用完全相同的 canvas、视觉中心、foot anchor 和 display box。小皮槽位为 `headLook/outfit/accessory`，母鸡槽位为 `headwear/neckwear`；必要遮挡拆成 `back/front`，不得把免费默认装束和收费商品压平为同一张角色图。

## 4. 第一批：已发布核心包补齐

### 4.1 花朵木牌冻结记录

| 顺序 | 工作项 | 稳定逻辑 ID | 场景 | 类型 | 规格 | 层/槽 | 状态 |
|---:|---|---|---|---|---|---|---|
| 1 | 花朵小木牌 | `scene-1-flower-sign` | 晴空农场 | 核心 small 贴纸 | `DEC-S` | `front` | `BATCH_READY` |

选择理由：它能在最低身份风险下同时校准 F4 独立道具画风、透明边缘、small 可见尺寸、ground anchor、前景遮挡和实际 iPad 缩放。它没有批准前，其余项目维持 `QUEUED` 或 `NEEDS_PRODUCT_DECISION`。

#### 结构化需求单（G1 前版本）

```yaml
asset_id: scene-1-flower-sign-f4-v1
logical_id: scene-1-flower-sign
layer: L2
scene_id: scene-1
subject: 晴空农场可摆放的花朵小木牌
state_or_action: 静态核心小贴纸；不承载动态文字
identity_reference: not_applicable_non_character_prop
style_reference:
  - design-samples/assets/rescue-basket-f4.png
  - design-samples/assets/kitchen-f4.png
environment_reference: design-samples/assets/farm-background-f3.png
composition_reference: visual-regression/stage-g/home-brand-font-single-bg-1194x834.png
reference_roles:
  rescue_basket: 独立透明道具的深棕手绘轮廓与柔和不透明水粉色块
  kitchen: 木质设施的材质、细节密度与 F4 道具家族关系
  farm_background: 只负责晴空农场色温、草地关系和环境协调
  full_screen: 只负责 104x82 pt 实际显示比例、朝向、遮挡与摆放位置
canvas_px: 1254x1254
display_box_pt: 104x82
ground_anchor_px: [631, 928]
placement_bounds_pt: { x_min: 40, x_max: 1154, y_min: 560, y_max: 810 }
scene_layer: front
facing: front_three_quarter_or_front
allowed_changes:
  - 木牌轮廓与支脚造型
  - 花朵在木牌结构上的位置和数量
  - 与晴空农场协调的低饱和木色和花色
must_preserve:
  - F4 深棕、略有手绘抖动的轮廓
  - 柔和不透明水粉色块与低频纸面色差
  - 缩至 104x82 pt 后仍清晰的单一轮廓
  - 稳定 ground anchor 和完整透明留白
must_not_include:
  - 任何文字、数字、箭头或临时状态
  - 白色贴纸外框、烘焙投影、背景草地
  - 角色、鸡蛋、星星、蝴蝶结或装饰粒子
  - 3D 高光、赛璐璐阴影、矢量图标感或高频木纹
export: transparent PNG, RGBA, sRGB
approval: g1-approved-2026-08-27
```

G1 候选生成前必须实际打开上述 4 张参考图，并逐张复述唯一职责。本看板不等于生成授权。

#### G1 冻结记录

- 批准候选：`scene-1-flower-sign-candidate-b2.png`
- 仓库外冻结源：`C:/Users/86181/.codex/visualizations/2026/08/11/019ff196-03e8-7661-92d6-b9aa81d1311c/s1-flower-sign-g1/scene-1-flower-sign-candidate-b2.png`
- 原始规格：1254×1254，RGB PNG
- 原始 SHA-256：`6038372221ECC9A66199151AA2264E51321D95AE6ABB45C96A6695B9E8A98E3D`
- 批准：爸爸于 2026-08-27 明确确认 B2 没问题；只批准 G1，不包含 G2–G4。

#### G2 独立校准记录（已批准）

- 透明版：`scene-1-flower-sign-b2-transparent.png`，SHA-256 `39AF555F721C8A14E3DD24F110E5CA32FE1CFEB99AA34844894ADAABA24A3887`
- 统一画布版：`scene-1-flower-sign-b2-normalized-1254.png`，SHA-256 `F4AE3A9BE5D2E2BA4BFCA1C32AD56F4C823ECDD296473BFBF534E41107B1808B`
- 校准板：`scene-1-flower-sign-b2-g2-calibration-board-v2.png`，SHA-256 `F1360EEE07A5C6B9913153ECF43B0AC6F00D1816634C88BE65FEAC089A6B3D0E`
- 仓库外目录：`C:/Users/86181/.codex/visualizations/2026/08/11/019ff196-03e8-7661-92d6-b9aa81d1311c/s1-flower-sign-g2/`
- alpha bbox：源 `(305,163)–(955,1091)`；归一后 `(305,1)–(955,929)`。
- 归一参数：只做整体平移 `dx=0, dy=-162 px`；ground anchor 从 `(631,1090)` 对齐到 `(631,928)`；无缩放、无拉伸。
- G3 勘误：旧校准板曾把正方形画布横向拉伸到 `104×82 pt`，因此旧板的 `53.9 pt` 可见宽度不符合真实 CSS。生产 `.farm-decoration-f7 img { object-fit: contain; }` 会把画布等比落入 `82×82 pt` 图像框，真实可见轮廓约 `42.5×60.7 pt`；透明画布、anchor 与冻结 PNG 本身不变。
- 技术验证：透明四角、前景 1 个连通组件、主体 RGB mismatch `0`。
- 批准：爸爸于 2026-08-27 对 G2 校准板明确确认“没问题”，记为 `G2_APPROVED`；上述真实 CSS 尺寸勘误必须随 G3 实景板重新确认，不包含 G3 或 G4 批准。

#### G3 实景机械合成记录（待批准）

- 冻结输入：`scene-1-flower-sign-b2-normalized-1254.png`，SHA-256 `F4AE3A9BE5D2E2BA4BFCA1C32AD56F4C823ECDD296473BFBF534E41107B1808B`。
- 目标背景：`visual-regression/stage-g/home-brand-font-single-bg-1194x834.png`，SHA-256 `DFE09EEF42850C0936D41F5699B09817E59EE93470A5D9014714C2549220D53E`。
- 默认落点实景：`scene-1-flower-sign-b2-g3-default-home-1194x834.png`，SHA-256 `85ED2AC741D569C96C61442FD1170838D68A8D00C70CF7F02B4785F496F04BCF`。
- G3 审阅板：`scene-1-flower-sign-b2-g3-review-board-v1.png`，SHA-256 `DFA0F7E9607A6923D9690D4F10275497C9E89E23A3A4F410554D0C8219C00C4A`。
- 仓库外目录：`C:/Users/86181/.codex/visualizations/2026/08/11/019ff196-03e8-7661-92d6-b9aa81d1311c/s1-flower-sign-g3/`。
- 生产公式：默认 home `(597,685)`；元素框左上 `(544.6683,624.3174)`、尺寸 `104×82 pt`；`object-fit: contain` 后实际正方形图像框左上 `(555.6683,624.3174)`、尺寸 `82×82 pt`。
- 实际可见 bbox 约 `(575.61,624.38)–(618.12,685.07)`，可见轮廓约 `42.5×60.7 pt`；像素变化 bbox 为 `(573,624)–(621,688)`。
- 遮挡判断：`front` 层会覆盖角色，但默认落点位于左侧小鸡与母鸡之间，当前整场未压住角色主体；花朵、木牌和垂饰在 1× 下仍可辨认。
- 批准：爸爸在看到真实 CSS 尺寸勘误、完整 G3 板和“确认后进入 G4”的说明后，于 2026-08-27 明确回复“继续”，记为 `G3_APPROVED`；不自动包含 G4 批量授权。

#### G4 单文件生产授权材料（已作废留档）

- 范围：只包含 `scene-1-flower-sign` 这一件资产；其余场景贴纸、旅行路牌、装扮、角色和变体全部排除。
- 机器可读计划：`scene-1-flower-sign-g4-production-plan-v1.json`，SHA-256 `005039DD9A39B4E7FF0D31C24986DB175B12FBB7A4723C1B94C810B534DF0CAF`。
- 仓库外目录：`C:/Users/86181/.codex/visualizations/2026/08/11/019ff196-03e8-7661-92d6-b9aa81d1311c/s1-flower-sign-g4/`。
- 唯一生产文件：`public/assets/f4/scenes/scene-1/decorations/flower-sign.png`；运行时 asset ID 为 `scenes/scene-1/decorations/flower-sign.png`。
- 交付方式：从 G2 统一画布版做**字节不变复制**，不重新编码、不优化、不缩放、不注入元数据；预期最终 SHA-256 仍为 `F4AE3A9BE5D2E2BA4BFCA1C32AD56F4C823ECDD296473BFBF534E41107B1808B`，大小 `1,464,834 bytes`。
- 最终规格：1254×1254 RGBA PNG，无嵌入 ICC（浏览器默认按 sRGB 解释），alpha bbox `(305,1)–(955,929)`；`small/core/front`，5 鸡蛋，display box `104×82 pt`，ground anchor `(631,928)`，允许 home `x 40–1154 / y 560–810`。
- 登记点：`src/domain/farmScenes.ts` 将这一项映射为上述 asset ID 且 `assetStatus='approved'`；`public/assets/f4/asset-manifest.json` 登记同一文件和哈希。
- 离线：现有 Workbox `**/*.png` 会自动预缓存；文件 `1.40 MiB`，低于 `6 MiB` 单文件上限。生产验收必须从构建产物确认该 URL 已进入 precache。
- 代码验收：更新领域测试为“只有花朵木牌 approved”，生产目录中只显示这一件贴纸，并保持既有 render contract；运行 `npm test`、`npm run typecheck`、`npm run build` 和 1194×834 实际舞台回归。
- 回退点：仅把该项恢复为 `internal-placeholder:scene-1-flower-sign` / `internal-placeholder`，删除清单中的单条记录与唯一生产文件；保留用户已有 ownership/placement 数据，使物件隐藏但不删档。
- 作废裁决：爸爸于 2026-08-27 要求“这个场景还有其他的要做的吗？都确定好了一起复制截图完整验收”。因此该单文件计划未获 G4 授权、不得执行；JSON 只保留为历史留档，花朵木牌转为 `BATCH_READY`，等待场景 1 核心包整批 G4。

### 4.2 场景 1 商店最小上线批次（已暂停）

现有生产资产已覆盖背景、地图缩略图、标准母鸡、标准小皮与免费草帽蓝背带裤造型、普通小鸡、已批准异色小鸡 B、已批准特殊小鸡 F，以及场景专属鸡窝 8 态。本轮不重做这些文件。为了尽快开放“存鸡蛋—买装饰—摆放/穿戴”的真实闭环，免费旅行路牌与两款新增小鸡移回后续队列，不阻塞商店上线。

最小上线批次固定为 4 个原创项、5 个生产 PNG；花朵木牌已齐，其余按下表逐件推进：

| 顺序 | 原创项 | 稳定逻辑 ID | 冻结产品造型 | 预计交付文件 | 状态 |
|---:|---|---|---|---:|---|
| 1 | 花朵小木牌 | `scene-1-flower-sign` | 已批准 B2 | 1 | `BATCH_READY` |
| 2 | 野餐木箱 | `scene-1-picnic-crate` | 已批准候选 C；矮木箱、奶油红格布、面包与带花纹保温壶组成的紧凑野餐轮廓，无角色与文字 | 1 | `BATCH_READY` |
| 3 | 欢迎地标 | `scene-1-welcome-landmark` | 花藤木拱门与低矮栅栏形成迎宾入口，不写 Welcome 或章节名 | 1 | `G1_REVIEW` |
| 4 | 小皮核心主题配饰 | `xiaopi-accessory-scene-1-core` | 向日葵种子斜挎包，适配标准小皮；背带后层＋包体前层，不改变角色身体 | 2 | `QUEUED` |

本批预计新增 5 个生产 PNG（4 个原创项，其中斜挎包拆 `back/front` 两层）。旅行路牌、新增小鸡、扩展目录贴纸与其余装扮保持原队列，不阻塞本轮商店上线，也不进入本轮完整截图。

#### 免费旅行路牌 G1 候选记录（待选择）

- 生成方式：按 `imagegen` skill 使用内置 `image_gen`；每个结构单独调用，未使用 CLI/API fallback。
- 候选 A：`scene-1-travel-sign-candidate-a.png`，1145×1374 RGBA，透明四角，SHA-256 `FAD88E68A40FD95B82D63CB8904379FE618D884979A059B25493573F362ECC5B`。牌面最大、技术最干净，但整体偏高、木纹较多。
- 候选 B2：`scene-1-travel-sign-candidate-b2.png`，1536×1024 RGBA，透明四角，SHA-256 `2A163828146E98B0BF47016F2B71839D7A762EE897FEC2CC7AC2EEBF2E7330FB`。矮宽比例更适合场景，但背景提取后仍有半透明棕色光晕；若选中，G2 必须先证明可只改 alpha 清除，否则退回 G1。
- 候选 C：`scene-1-travel-sign-candidate-c.png`，1716×916 RGB，SHA-256 `0D498745D0C799FE79150E869CDB03C879E7800A0628FA10C92CDE7A438E2A0D`。结构最宽，但棋盘格被烘焙进 RGB，当前仅作造型参考；不建议直接冻结。
- A 修订裁决：爸爸选择“第一个”，并要求“上面加些图案”。A 仅作为修订基底，尚未冻结为 G1 定稿。
- 候选 A2 原始输出：`scene-1-travel-sign-candidate-a2.png`，1132×1389 RGB，SHA-256 `94C1D7C51659D226511F07C049D52ABA08115C808111ECEED5B655933E20C905`。两块牌面的外侧边角各增加一组低对比度奶油黄小花与鼠尾草绿叶，中央超过 70% 保持空白；内置编辑工具轻微改变了画布尺寸并烘焙棋盘格，因此它是新候选而非 A 的纯局部像素补丁。
- A2 透明审阅预览：`scene-1-travel-sign-candidate-a2-transparent-preview.png`，1132×1389 RGBA，alpha bbox `(142,68)–(1038,1290)`，透明四角，SHA-256 `BF3E84BFE504CC1D1C0C0542846BBF8C8C066BDC0FCE6B30A8D34961C7C1E892`。该预览只从 A2 派生 alpha，主体 RGB 不变；不等于 G2 已批准。
- A2 编辑提示词：`scene-1-travel-sign-a2-prompt-v1.md`，SHA-256 `B7EF5A1780908875A3C4099139A58934C565D3FC97833DA0E4C8114718B702E7`；使用内置 `image_gen`，未使用 CLI/API fallback。
- A2 动态文字整场预览：`scene-1-travel-sign-a2-dynamic-text-scene-preview-v1.png`，SHA-256 `0243B37FED6D0380FB850FE1EE0EF23A39AC4B5193D58CCE3839497079205AB0`。在 1194×834 晴空农场基线截图中机械摆入 A2，并由预览脚本叠加 `去第 2 章 / 苹果园 / 随时出发`；文字没有烘焙回 PNG。
- A2 动态文字审阅板：`scene-1-travel-sign-a2-dynamic-text-review-board-v1.png`，SHA-256 `4F05AB06A8B94FBA0EB8594D463C2C950A2C9C56D6A40ABB86BF4CEFB5AE95D1`；指标 `scene-1-travel-sign-a2-dynamic-text-metrics-v1.json`，SHA-256 `6703F4F7CC9D98DF8802AD799EA2114C7866625ADFF73F592CD8B7A82F3C76E2`。本次仅验证牌面不空、边角图案不挤占正文及整场不遮挡；临时 display box `171×210 pt`、位置 `left 1015 / top 416` 均未冻结，仍须在 G2 定稿。
- A2 动态文字方案裁决：爸爸随后明确要求“不要加字，加图案”，所以上述 A2 动态文字整场图和审阅板只保留为否决记录，状态 `SUPERSEDED`；不得进入 G2，也不得作为运行时文字叠加依据。
- 候选 A3 原始输出：`scene-1-travel-sign-candidate-a3.png`，1132×1390 RGB，SHA-256 `28A934FE981324C768E11959A8F68114ECB8F571102952AEC8F3529140F270F2`。使用内置 `image_gen` 从 A2 编辑，只在两块牌面增加上下镜像的奶油黄小花、鼠尾草绿叶与浅色卷藤，无文字、数字或章节符号；生成器再次烘焙棋盘格，原始文件不得直接生产使用。
- A3 透明审阅预览：`scene-1-travel-sign-candidate-a3-transparent-preview.png`，1132×1390 RGBA，alpha bbox `(142,68)–(1042,1303)`，透明四角，SHA-256 `DF604215C13E9274013323DA2D77EE05C5A21EE986705E0686E3340F882B703F`。只派生 alpha、不重画主体 RGB；仍不等于 G2 生产透明版。
- A3 纯图案整场预览：`scene-1-travel-sign-a3-pattern-only-scene-preview-v1.png`，SHA-256 `EE4929370948937FE4A1789BF09427EC2BBAE3CB4149380D494609F760297098`；审阅板 `scene-1-travel-sign-a3-pattern-only-review-board-v1.png`，SHA-256 `27211AD382683940E6A24376AEEB5D4D29405515F945C0EED30F47EAB5C41CC7`；指标 `scene-1-travel-sign-a3-pattern-only-metrics-v1.json`，SHA-256 `46C8C0B3BD77E9C2D07978D9D95D43F1993A5577FD4DBFBCBA909FF67B0C937A`。临时 display box `171×210 pt`、位置 `left 1015 / top 416`，只验证纯图案在整场缩小后仍可辨认及无遮挡，未冻结 G2 参数。
- A3 编辑提示词：`scene-1-travel-sign-a3-prompt-v1.md`，SHA-256 `0417542BA2AF5FFD53E4DFC74E23CE0F4001B0C7C95BAB6DAD8503E13E168A9B`；使用内置 `image_gen`，未使用 CLI/API fallback。
- 审阅板：`scene-1-travel-sign-g1-review-board-v1.png`，SHA-256 `B937DCCF64D093C9F66CE943FFFF0ED820E58B46016FB75E7977B919133D52A1`。
- 指标：`scene-1-travel-sign-g1-metrics-v1.json`，SHA-256 `E7F65E65354892DE921A64CF9518D626FEB00BA75B463694F25D7D8FA6774F83`。
- 提示词集：`scene-1-travel-sign-g1-prompts-v1.md`，SHA-256 `F93340BDED1DA7E630D787949EBB5DBD14A03CA00D5E9953CCD209B6F6C7672A`。
- 仓库外目录：`C:/Users/86181/.codex/visualizations/2026/08/11/019ff196-03e8-7661-92d6-b9aa81d1311c/s1-travel-sign-g1/`。当前状态 `G1_REVIEW`，等待对具体 A3 纯图案方案给出新批准；未自动进入 G2。

#### 场景 1 商店上线阻塞审计

- 2026-08-27 按爸爸“当务之急是把商店和场景一的服装功能上线”重新检查生产代码。原子扣蛋、重复购买防重、永久所有权、免费摆放/收起、衣柜购买与装备事务均已存在并有测试；生产儿童目录仍为空，是因为场景 1 的 9 件装饰全部为 `internal-placeholder`，`FARM_COSMETIC_DEFINITIONS` 也为空。
- 当前 `public/assets/f4` 没有任何可售场景 1 装饰或付费服装图层。直接开放内部开关只会形成“能扣蛋但买完不显示”的假商店，明确禁止。
- 最小上线内容收敛为 4 件：已通过 G1–G3 的花朵小木牌、野餐木箱、欢迎地标，以及小皮向日葵种子斜挎包 `back/front`。四件通过 G1–G3 后一起请求 G4；复制后再切换到代码/持久化 L2 与 Pages 构建 L3 门禁。

#### 欢迎地标 G1 结构化需求单（当前）

```yaml
asset_id: scene-1-welcome-landmark-f4-v1
logical_id: scene-1-welcome-landmark
layer: L2
scene_id: scene-1
subject: 晴空农场可摆放的花藤木拱门欢迎地标
state_or_action: 静态核心 landmark；形成可穿行的迎宾入口
identity_reference: not_applicable_non_character_prop
style_reference:
  - design-samples/assets/rescue-basket-f4.png
  - design-samples/assets/kitchen-f4.png
environment_reference: design-samples/assets/farm-background-f3.png
composition_reference: visual-regression/stage-g/home-brand-font-single-bg-1194x834.png
reference_roles:
  rescue_basket: 只负责深棕手绘轮廓、柔和不透明水粉色块与透明边缘
  kitchen: 只负责木材质、细节密度以及奶油红与鼠尾草绿的同族配色
  farm_background: 只负责晴空农场色温与环境协调
  full_screen: 只负责 330x300 pt 实际比例、back 层构图、路径与角色间隙
canvas_px: 1254x1254
display_box_pt: 330x300
ground_anchor_px: [636, 1145]
placement_bounds_pt: { x_min: 240, x_max: 954, y_min: 390, y_max: 700 }
scene_layer: back
facing: near_front_with_gentle_depth
allowed_changes:
  - 圆拱、轻微不对称拱或小屋式拱顶的结构差异
  - 花藤覆盖密度与奶油黄小花的分布
  - 两侧低矮栅栏的板条节奏与轻微透视
must_preserve:
  - 木拱门与两侧相连低矮栅栏组成单一完整轮廓
  - 中央开口宽敞，缩至 330x300 pt 后仍像可穿行入口
  - 深棕略带手绘抖动的轮廓、暖木色、鼠尾草绿叶和奶油黄花
  - 透明四角与稳定地面基线
must_not_include:
  - Welcome、章节名、任何文字、数字、箭头或牌面
  - 角色、鸡蛋、建筑、道路、草地或完整背景
  - 关闭入口的门板、白色贴纸边、烘焙投影或漂浮装饰粒子
  - 3D 高光、写实摄影、赛璐璐阴影、矢量图标感或高频木纹
export: transparent PNG, RGBA, sRGB
approval: pending-g1-selection
```

G1 生成前已实际打开 4 张参考图并按上述唯一职责复核。三候选只比较结构：A 为对称圆拱，B 为轻微不对称花藤拱，C 为小屋式拱顶；不得把 G1 临时缩放或落点当作 G2 冻结参数。

#### 欢迎地标 G1 候选记录（待选择）

- 生成方式：按 `imagegen` skill 使用内置 `image_gen`，每个结构单独调用；未使用 CLI/API fallback。
- 候选 A：`scene-1-welcome-landmark-candidate-a.png`，1536×1024 RGBA，透明四角，alpha bbox `>1` 为 `(11,70)–(1524,908)`，SHA-256 `3ECF4FA98C127776F975433DFF0ADAC1AABBEC65C1C2B763E5AC837BF7FC0C90`。对称圆拱最经典、花藤均衡，但透明层带较宽暖色光晕；若选中，G2 必须证明可安全清理。
- 候选 B：`scene-1-welcome-landmark-candidate-b.png`，1482×1062 RGBA，透明四角，alpha bbox `>1` 为 `(48,95)–(1436,966)`，SHA-256 `90251E34F72C8260E531BAA20132B1E081469D9614CA86415995E1102AA0463D`。轻微不对称、入口最通透、轮廓最轻，透明边缘三者中最干净；当前审阅推荐。
- 候选 C：`scene-1-welcome-landmark-candidate-c.png`，1536×1024 RGBA，透明四角，alpha bbox `>1` 为 `(19,110)–(1514,914)`，SHA-256 `582A3C69978D29883B66BD79F104A374025DBCE308214C8B281587D550DD1E6D`。小屋式拱顶的地标感最强，但体量较重且透明层带较宽暖色光晕；若选中，G2 必须证明可安全清理。
- 三张 G1 临时整场预览统一使用可见框 `285×245 pt` 与 home `(520,640)`，只用于同尺寸比较；未冻结正式 `330×300 pt` 图像布局、ground anchor 或默认落点。
- 审阅板：`scene-1-welcome-landmark-g1-review-board-v1.png`，SHA-256 `8F497AF510312132D2586859A525576805A3AEBC6D7422C9E52E24345D4BDC4A`。
- 指标：`scene-1-welcome-landmark-g1-metrics-v1.json`，SHA-256 `00D55FD0FE15A4A961A258CC0A4CB0FFF1274AD458655F98692DADCF858AA536`；提示词集 `scene-1-welcome-landmark-g1-prompts-v1.md`，SHA-256 `A67D96E54551B6B6A540F757808214169D1BBD847D32514349BE2D6DC769E67D`。
- 仓库外目录：`C:/Users/86181/.codex/visualizations/2026/08/11/019ff196-03e8-7661-92d6-b9aa81d1311c/s1-welcome-landmark-g1/`。当前状态 `G1_REVIEW`；等待爸爸选择具体 A/B/C，不自动进入 G2。

#### 野餐木箱 G1 定稿、G2 校准与 G3 实景（已批准）

- 生成方式：按 `imagegen` skill 使用内置 `image_gen`，以 `rescue-basket-f4.png` 只负责描边/水粉/透明道具语法，以 `kitchen-f4.png` 只负责木材质和奶油红/鼠尾草绿配色；未使用 CLI/API fallback。
- 候选 A：`scene-1-picnic-crate-candidate-a.png`，1402×1122 RGBA，alpha bbox `(102,55)–(1356,1122)`，透明四角，SHA-256 `7AB790E9BE2232B778CED5AA5E33BD52A721C9241B30294E8C09E75B85810CD4`。三分之四视角立体感最强，但直立长面包使轮廓偏高。
- 候选 B：`scene-1-picnic-crate-candidate-b.png`，1526×1030 RGBA，alpha bbox `(0,35)–(1458,1016)`，透明四角，SHA-256 `F85DD30364926BF97CFBCC89356EE8673BCE7D67187D396DD59F7C3903AF33C1`。两层矮木箱、右侧格布披挂，低宽比例最贴合中型装饰框；当前审阅推荐。
- 候选 C：`scene-1-picnic-crate-candidate-c.png`，1512×1040 RGBA，alpha bbox `(0,37)–(1476,1016)`，透明四角，SHA-256 `B943D748645AB5A576038557754A717473854C2E8BC533A19D5D49E5F2274C52`。近正面构图最整齐，但保温壶出现额外花纹，契约纯度弱于 B。
- G1 裁决：爸爸于 2026-09-08 明确回复“C，继续”，选择候选 C；保温壶现有花纹随具体候选一并冻结，记为 `G1_APPROVED`。
- 三个候选都是真 RGBA、alpha extrema `(0,255)`，无棋盘格烘焙；G1 使用预览统一机械放入临时 `205×138 pt` 框与 `(420,750)` 落点，未冻结 G2 参数。
- 审阅板：`scene-1-picnic-crate-g1-review-board-v1.png`，SHA-256 `2E265017A9E87D6DB1E857E5AF6999D7AABB9A15AD3AB222B38E9246D23AFC5D`；指标 `scene-1-picnic-crate-g1-metrics-v1.json`，SHA-256 `C15F1C1331F62624AC3B6833F26523E8B12D7A64136EE7BC568F9404EB0C44AD`；提示词集 `scene-1-picnic-crate-g1-prompts-v1.md`，SHA-256 `76B86F4565C0119826637843940FE9198F49CFD6C67AAA2C19C4A31A3BCB3956`。
- G2 alpha 清理版：`scene-1-picnic-crate-c-alpha-clean.png`，只把源文件 `alpha<=1` 的不可见雾边清零，保留其余 alpha，主体 RGB mismatch `0`；1512×1040 RGBA，clean alpha bbox `(172,68)–(1346,898)`，SHA-256 `E2D5AEEE14E38F7EDF27ED5444A7EC9240CDFCF7C6DCDAA8A8432CD3140579F9`。
- G2 统一画布版：`scene-1-picnic-crate-c-normalized-1254.png`，1254×1254 RGBA，normalized alpha bbox `(64,181)–(1194,980)`，单一前景、透明四角，SHA-256 `C1A02D8057D40BFA550DCFDB09F15B44528FCBBFCEBF223AC99DA5C7F2579B4C`。只对 clean bbox 等比缩放 `0.9625212947` 后平移至 `(64,181)`；可见像素尺寸 `1130×799`。
- G2 拟冻结参数：display box `205×138 pt`，方形源图按真实 CSS `object-fit: contain` 进入 `138×138 pt` 图像面，可见轮廓约 `124.4×87.9 pt`；ground anchor `(629,980)`；`actor` 层；默认机械预览落点 `(420,750)`。
- G2 场景预览：`scene-1-picnic-crate-c-g2-scene-preview-1194x834.png`，SHA-256 `E236BB53B9CA4361D5A711F72ED83BCD44904BA3540AF5962E4124876471436F`。木箱在孵化屋右侧、左侧小鸡之前，不挡任务板、孵化屋、母鸡、小皮或鸡群。
- G2 校准板 v1 `scene-1-picnic-crate-c-g2-calibration-board-v1.png` 因整场截图下半部被板面裁掉而作废，只保留失效记录；不得用于批准。
- 有效 G2 校准板：`scene-1-picnic-crate-c-g2-calibration-board-v2.png`，SHA-256 `3ED058FA63CCCBEC068D29832679FF2B71FE4EEF848231107F28CB1E09670588`；指标 `scene-1-picnic-crate-c-g2-metrics-v2.json`，SHA-256 `60D4049F8FFBDAECFD8B065379162DF44C8857CDE59915FA016E47C9918705F2`。
- G2 仓库外目录：`C:/Users/86181/.codex/visualizations/2026/08/11/019ff196-03e8-7661-92d6-b9aa81d1311c/s1-picnic-crate-g2/`。爸爸在看到有效 v2 校准板后于 2026-09-08 明确回复“继续”，上述参数记为 `G2_APPROVED`；不自动包含 G3/G4。
- G3 冻结输入：`scene-1-picnic-crate-c-normalized-1254.png`，SHA-256 `C1A02D8057D40BFA550DCFDB09F15B44528FCBBFCEBF223AC99DA5C7F2579B4C`；生成前后源哈希一致。
- G3 目标背景：`visual-regression/stage-g/home-brand-font-single-bg-1194x834.png`，SHA-256 `DFE09EEF42850C0936D41F5699B09817E59EE93470A5D9014714C2549220D53E`。
- G3 默认落点整场：`scene-1-picnic-crate-c-g3-default-home-1194x834.png`，SHA-256 `C698379980FDE281F9E85925A67A5A583465DE0EFFB5894AE062FDF308D0AFE0`。
- G3 审阅板：`scene-1-picnic-crate-c-g3-review-board-v1.png`，SHA-256 `F2848CA3E3F8E5E55D785AFCD1B5515EB2123586620F6F369CC8B0B57A15BB2`；指标 `scene-1-picnic-crate-c-g3-metrics-v1.json`，SHA-256 `3DFC05FDB9EB241E877401FB5A81E1129F7A01E6A56096B6923EA26657FAE2B9`。
- G3 生产公式：默认 home `(420,750)`；元素框左上 `(317.1730,642.1531)`、尺寸 `205×138 pt`；`object-fit: contain` 后正方形图像框左上 `(350.6730,642.1531)`、尺寸 `138×138 pt`。
- G3 实际可见 bbox 约 `(357.72,662.07)–(482.07,750.00)`，可见轮廓约 `124.4×87.9 pt`；像素变化 bbox `(355,660)–(484,752)`。
- G3 遮挡判断：运行时使用 `actor` 层；默认落点位于孵化屋右侧和小鸡左侧，与角色主体无重叠，因此在当前落点上使用扁平参考背景合成与实际层级视觉等价。仓库外目录：`C:/Users/86181/.codex/visualizations/2026/08/11/019ff196-03e8-7661-92d6-b9aa81d1311c/s1-picnic-crate-g3/`。
- G3 批准：爸爸在看到完整 G3 审阅板和“不遮挡孵化屋、小鸡、角色或任务板”的说明后，于 2026-09-08 明确回复“继续”，记为 `G3_APPROVED` 并转入 `BATCH_READY`；不自动包含 G4 复制授权。

#### 整批门禁与最终验收

1. 剩余欢迎地标与小皮斜挎包仍一次只推进一项 G1；每项独立通过透明化、画布、bbox、anchor/角色贴合与实际尺寸 G2，再做 G3。
2. 四项全部通过 G1–G3 后，只提交一份包含 5 个 PNG、运行参数、清单和回退点的 G4 授权材料；不再逐件复制。
3. G4 批准后一次性复制，并补齐衣柜 `layerManifestId` 到斜挎包 `back/front` 图层的实际映射；免费旅行路牌不属于本次商店最小上线批次。
4. 真实应用最终验收固定为三张 1194×834 截图：农场总览（3 件核心装饰同时可见）、贴纸商店（3 件核心装饰及价格/状态）、衣柜与装备（斜挎包购买、穿戴和首页显示）。三张合成一块最终审阅板，并验证离线预缓存、测试、构建与回退。

### 4.3 同族核心场景物件队列

这些项目只能在校准资产通过 G1–G3，并由爸爸/小皮明确给出 G4 批量授权后，按冻结参数逐项生产。

| 顺序 | 工作项 | 稳定逻辑 ID | 场景 | 类型 | 规格 | 层 | 参考包 | 状态 |
|---:|---|---|---|---|---|---|---|---|
| 2 | 免费旅行路牌 | `scene-1-travel-sign` | 晴空农场 | 免费核心物件 | 单独需求单 | `actor` 待冻结 | `PROP-S1` | `G1_REVIEW` |
| 3 | 野餐木箱 | `scene-1-picnic-crate` | 晴空农场 | 核心 medium 贴纸 | `DEC-M` | `actor` | `PROP-S1` | `BATCH_READY` |
| 4 | 欢迎地标 | `scene-1-welcome-landmark` | 晴空农场 | 核心 landmark | `DEC-L` | `back` | `PROP-S1` | `G1_REVIEW` |
| 5 | 免费旅行路牌 | `scene-2-travel-sign` | 苹果园 | 免费核心物件 | 单独需求单 | `actor` 待冻结 | `PROP-S2` | `QUEUED` |
| 6 | 花篮 | `scene-2-flower-basket` | 苹果园 | 核心 small 贴纸 | `DEC-S` | `front` | `PROP-S2` | `QUEUED` |
| 7 | 田野长椅 | `scene-2-field-bench` | 苹果园 | 核心 medium 贴纸 | `DEC-M` | `actor` | `PROP-S2` | `QUEUED` |
| 8 | 风车地标 | `scene-2-windmill-landmark` | 苹果园 | 核心 landmark | `DEC-L` | `back` | `PROP-S2` | `QUEUED` |

旅行路牌不使用贴纸商店价格规格，但同样必须独立透明、不得烘焙章节名或动态文字；最终 display box、ground anchor、层级和点击区需在单独需求单中冻结。

### 4.4 核心主题装扮队列

| 顺序 | 工作项 | 稳定逻辑 ID | 场景 | 目标/槽位 | 价格 | 必要文件 | 参考包 | 状态 |
|---:|---|---|---|---|---:|---|---|---|
| 9 | 场景 1 收费主题饰品 | `xiaopi-accessory-scene-1-core` | 晴空农场 | 小皮 `accessory` | 10 蛋 | 向日葵种子斜挎包；冻结 `back/front` 两层 | `COS-X-S1` | `QUEUED` |
| 10 | 场景 2 收费主题头饰 | `mother-headwear-scene-2-core` | 苹果园 | 母鸡 `headwear` | 10 蛋 | 按遮挡冻结 `back/front`；至少 1 层 | `COS-M-S2` | `NEEDS_PRODUCT_DECISION` |

需要爸爸/小皮先确定两件商品的具体主题和造型。核心装扮不得与场景免费默认装束合并，也不得改画角色身体。场景 1 继续以 `xiaopi-f3` 为标准呈现；场景 2 的苹果园角色基准只用于贴合与构图，不自动授权修改身份。

### 4.5 小鸡款式池补齐

当前共享款继续保留为已批准 fallback。本批新增的目标是让每章至少拥有“共享异色 B + 1 个章节异色”和“1 个章节特殊”可选款式；具体造型在各自 G1 决定。

| 顺序 | 工作项 | 预留稳定逻辑 ID | 场景 | 类型 | 规格 | 参考包 | 状态 |
|---:|---|---|---|---|---|---|---|
| 11 | 第 2 款异色小鸡 | `chick-color-scene-1-02-f4` | 晴空农场 | 异色：鼠尾草/薄荷绿＋奶油黄 | `CHAR-C` | `CHICK-S1` | `QUEUED` |
| 12 | 章节特殊小鸡 | `chick-special-scene-1-01-f4` | 晴空农场 | 特殊：云朵羽毛＋天空蓝/淡紫阴影 | `CHAR-C` | `CHICK-S1` | `QUEUED` |
| 13 | 第 2 款异色小鸡 | `chick-color-scene-2-02-f4` | 苹果园 | 异色 | `CHAR-C` | `CHICK-S2` | `NEEDS_PRODUCT_DECISION` |
| 14 | 章节特殊小鸡 | `chick-special-scene-2-01-f4` | 苹果园 | 特殊 | `CHAR-C` | `CHICK-S2` | `NEEDS_PRODUCT_DECISION` |

预留逻辑 ID 在代码接入前必须再次核对；候选批准后不得因视觉昵称改变存档逻辑 ID。异色和特殊允许改变需求单明确列出的颜色、姿势、羽毛轮廓、花纹或局部造型，但未获准的身份特征必须保持 F4 家族一致。

### 4.6 场景 2 全道具 G1–G4 与商店上线（已完成）

爸爸于 2026-09-09 明确说明小皮已直接进入苹果园，要求暂停场景 1，并把场景 2 的所有道具一次性生成后统一选择。本批按产品完整目录生成 10 件：免费路牌 1 件，另有 4 small、3 medium、2 landmark 共 9 件可购买贴纸。角色、小鸡、装扮、鸡窝状态，以及已接入的固定苹果汁驿站不属于“道具”批次。

代码已有稳定逻辑 ID 的 3 件核心贴纸和免费路牌保持原名；其余 6 件扩展贴纸在代码中尚无定义，本轮名称与 ID 只是 G1 产品候选，批准后还需单独冻结，不能直接接入：

| 编号 | G1 候选名 | 逻辑 ID / 暂用候选 ID | 类别 | 层 | 价格 | 单体造型契约 | 状态 |
|---:|---|---|---|---|---:|---|---|
| S2-00 | 苹果枝旅行路牌 | `scene-2-travel-sign` | 免费路牌 | 固定视觉 | 0 | 双向矮木路牌，以苹果、叶片与花朵图案区分方向；不写字 | `G4_PRODUCTION` |
| S2-01 | 苹果花篮 | `scene-2-flower-basket` | small/core | `front` | 5 | 矮藤篮装红苹果、少量白色苹果花与叶片 | `G4_PRODUCTION` |
| S2-02 | 苹果木箱 | `scene-2-apple-crate` | small/extension | `front` | 5 | 单层矮木箱，装 4–6 个红苹果，轮廓紧凑 | `G4_PRODUCTION` |
| S2-03 | 果汁陶壶 | `scene-2-cider-jugs` | small/extension | `front` | 5 | 一大一小奶油陶壶配杯子，苹果红与橄榄绿小图案 | `G4_PRODUCTION` |
| S2-04 | 果园提灯 | `scene-2-orchard-lantern` | small/extension | `front` | 5 | 暖木与砖红提灯，玻璃内为柔和奶油光，不画光晕 | `G4_PRODUCTION` |
| S2-05 | 田野长椅 | `scene-2-field-bench` | medium/core | `actor` | 10 | 暖木长椅，砖红格纹坐垫与一个苹果叶靠枕 | `G4_PRODUCTION` |
| S2-06 | 苹果收获车 | `scene-2-harvest-cart` | medium/extension | `actor` | 10 | 双轮矮木手推车，装苹果与折叠奶油红格布 | `G4_PRODUCTION` |
| S2-07 | 苹果分拣桌 | `scene-2-sorting-table` | medium/extension | `actor` | 10 | 低矮木工作桌，三个浅盘按红/黄/青苹果分拣 | `G4_PRODUCTION` |
| S2-08 | 苹果园风车 | `scene-2-windmill-landmark` | landmark/core | `back` | 20 | 矮胖木风车，奶油叶片、砖红屋顶与苹果小图案 | `G4_PRODUCTION` |
| S2-09 | 苹果树秋千 | `scene-2-apple-tree-swing-landmark` | landmark/extension | `back` | 20 | 一段结实苹果树干与横枝、悬挂木板秋千，红苹果形成地标轮廓 | `G4_PRODUCTION` |

共同参考职责：`public/assets/f4/scenes/scene-2/apple-juice-station.png` 只负责砖红、奶油、橄榄绿、暖木配色与木制设施细节密度；`design-samples/assets/rescue-basket-f4.png` 只负责透明边缘、深棕手绘线和柔和不透明水粉块；`public/assets/f4/scenes/scene-2/orchard-background.png` 只负责苹果园色温与主题协调；场景 2 小皮和母鸡只核对同场颜色，不作为道具身份或构图输入。上述 5 张参考已在生成前实际打开。

共同禁止：任何文字、数字、价格、额外绘制的箭头符号、UI、角色、鸡蛋、完整道路/草地/天空背景、烘焙投影、白色贴纸边、漂浮粒子、写实摄影、3D 高光、赛璐璐阴影、矢量图标感或高频木纹；旅行路牌自身的尖头木板轮廓除外。每件必须是单一完整透明 RGBA 道具；G1 只选造型，不冻结 1254 方形画布、alpha 清理、anchor、正式 display box 或默认落点。

#### 场景 2 全道具 G1 生成记录（待统一选择）

- 生成方式：按 `imagegen` skill 使用内置 `image_gen`，10 件各自独立调用；未使用 CLI/API fallback。
- 10 件均为真实 RGBA PNG，alpha extrema 覆盖 `(0,255)` 或 `(0,254)`，肉眼透明四角；S2-01 与 S2-02 的左下角各残留 `alpha=1`，其余 8 件四角严格为 0。若前两件获批，G2 只允许清除该不可见 alpha，不得改变主体 RGB。
- 源文件 SHA-256：S2-00 `DECC4CECDBAE805A4C0D2E7CB9D567D0FD566C3FCE0DE87307876FBC576B6207`；S2-01 `1E1D5D9D51DCF8A94F08DC4D5EE0054A1EE761C499AA0682DD667FD65E1BD0B8`；S2-02 `2910AE393CD53DB169E50A3610F470FFBD53E80E347AB763AC7DE9E569527AA5`；S2-03 `622464F714F8C73D2357D435B2F4AAD35B0FF0B3A016C151B8122A31BCB80433`；S2-04 `8A441C3B072E0609C9AD5FBBA7575A5A246EC741BA6F0FE1272DC2A574704C52`；S2-05 `FC7D0D5036D720005F2528D80806197E4D68DA6EC39BA1C9E777608A24D5B97C`；S2-06 `83FAD05BAAC0458C01A96332270F5F1755028CFE9A1FA14CCB1CC75F5002E422`；S2-07 `2B8E07BCC6D2B57D975FEE687C997AA20DA45931E246538D39B43F12BC42A801`；S2-08 `90E80856C303802C13312B014FEAB17FA97882AE01904B87E48CC9988060C57A`；S2-09 `619EA181FB667A8518B319B29E82A944D46C5B577FF81A8334071E567FFB5B5A`。
- 总审阅板：`scene-2-all-props-g1-review-board-v1.png`，SHA-256 `EEC362B8F62BFE89C17B85C795185B82BFC5C5065117EEC61CD5110F52725F7C`。
- 指标：`scene-2-all-props-g1-metrics-v1.json`，SHA-256 `954E1B8652D2AB116B0E0E7AC12A8193A9F49B7B0CB4BB3A6671358AF9D53B10`；提示词集 `scene-2-all-props-g1-prompts-v1.md`，SHA-256 `038A5FF226AF1C0D3FD75E2DE9104EFD0FEE56B0CD51833A210D6CC0B483DA09`。
- 仓库外目录：`C:/Users/86181/.codex/visualizations/2026/08/11/019ff196-03e8-7661-92d6-b9aa81d1311c/s2-all-props-g1/`。爸爸于 2026-09-09 明确回复“没问题，就这么定了，你调整好比例就把商店系统上架把”，据此 S2-00～S2-09 全部记为 `G1_APPROVED`，并明确授权继续做比例校准和生产接入。

#### G2 比例与锚点冻结

- 只执行确定性操作：将 `alpha <= 1` 清零、按剩余 alpha bbox 裁切、等比缩放并放入 `1254×1254 RGBA` 透明画布；没有重新生成、拉伸或重画主体。
- small 四件冻结为 `104×82 pt / anchor (631,928)`；可见 bbox 分别为花篮 `1050×850`、木箱 `1080×736`、陶壶 `1080×826`、提灯 `463×850 px`。
- medium 三件冻结为 `205×138 pt / anchor (629,980)`；可见 bbox 分别为长椅 `1120×697`、收获车 `1120×700`、分拣桌 `1120×591 px`。
- landmark 两件冻结为 `330×300 pt / anchor (636,1145)`；可见 bbox 分别为风车 `1060×1080`、树秋千 `1120×1017 px`。
- 免费路牌冻结为 `1254×1254`、可见 bbox `980×1080`、anchor `(627,1135)`，运行时固定框 `x=1006, y=468, 170×170 pt`。
- 全部 10 张生产图透明四角均为 0，单文件 `588802–1366894 bytes`。机器指标：`s2-all-props-g2/scene-2-all-props-g2-metrics.json`，SHA-256 `AED92B83F8D47BE9EA3B7507D2BC0F277F79970CA114125A504AECF5884AFFA1`。

#### G3 实景与 G4 生产接入

- 商店实景：`visual-regression/scene-2-shop-production/scene-2-decoration-shop-1194x834.png`，SHA-256 `619A37334804CE3E3C0D9CD9EE11B80D3716617F724D99AEB0FC08CB78D98587`；9 张缩略图全部解码成功。
- 整场实景：`visual-regression/scene-2-shop-production/scene-2-all-decorations-placed-1194x834.png`，SHA-256 `1BDE7A1BFD9DC0BFC3AA101431EAEC012E10A95993B276E33385285E73B2D1E1`；真实 VM 报告 9 件列出、9 件已摆放，免费路牌固定显示。
- 购买验收从 200 蛋逐件购买 9 件，准确扣除 90 蛋并剩余 110；small/medium/landmark 仍分别定价 5/10/20 蛋，购买后可摆出、收纳和拖动，事务结构与 IndexedDB schema 未改。
- G4 生产路径为 `public/assets/f4/scenes/scene-2/travel-sign.png` 与 `public/assets/f4/scenes/scene-2/decorations/*.png`；10 个生产 SHA-256 已写入 `public/assets/f4/asset-manifest.json`。6 个原暂用扩展 ID 随本次批准冻结为稳定逻辑 ID。
- 2026-09-09 L3 结果：48 个测试文件 / 271 项测试通过，TypeScript、全屏视觉层、视觉引用门禁通过；GitHub Pages 构建成功，PWA precache 含全部 10 张新图，子路径成品包冒烟测试再次通过。

### 4.7 场景 2 小皮与母鸡完整衣柜 G1–G4 与商店上线（已完成）

爸爸于 2026-09-09 指出“母鸡和小pi的服装还没做”。场景 2 的免费默认造型已经作为压平角色图发布，但收费衣柜确实仍为空；完整章节衣柜应有小皮 4 件、母鸡 2 件，总价 80 蛋。本批先用场景 2 角色基准生成每件只改变一个槽位的整身试装图，便于统一判断造型；它们不是可直接叠加的最终服装层。

| 编号 | G1 候选名 | 暂用逻辑 ID | 目标/槽位 | 价格 | 单槽变化 | 状态 |
|---|---|---|---|---:|---|---|
| S2-W01 | 苹果花短发 | `xiaopi-hair-scene-2-extension` | 小皮 `headLook` 发型 | 15 | 移除草帽与双辫，改栗棕短波波头和单枚苹果花发夹 | `G4_PRODUCTION` |
| S2-W02 | 果园头巾 | `xiaopi-hat-look-scene-2-extension` | 小皮 `headLook` 帽子造型 | 15 | 奶油果园软头巾、砖红格纹后结和短双辫 | `G4_PRODUCTION` |
| S2-W03 | 采果背带裤 | `xiaopi-outfit-scene-2-extension` | 小皮 `outfit` | 20 | 橄榄绿背带裤、奶油泡袖衬衣、砖红护膝与暖棕工作鞋 | `G4_PRODUCTION` |
| S2-W04 | 苹果斜挎包 | `xiaopi-accessory-scene-2-extension` | 小皮 `accessory` | 10 | 红苹果包身、橄榄叶翻盖与暖棕肩带，紧凑挂左髋 | `G4_PRODUCTION` |
| S2-W05 | 果园小软帽 | `mother-headwear-scene-2-core` | 母鸡 `headwear` | 10 | 替换格纹蝴蝶结，以奶油编织小软帽围住鸡冠，配砖红苹果花和叶片 | `G4_PRODUCTION` |
| S2-W06 | 格纹小领巾 | `mother-neckwear-scene-2-extension` | 母鸡 `neckwear` | 10 | 砖红格纹领巾、奶油波浪边与中央橄榄叶结 | `G4_PRODUCTION` |

共同约束：身份参考与编辑目标分别为 `public/assets/f4/scenes/scene-2/xiaopi.png` 和 `public/assets/f4/scenes/scene-2/mother.png`；必须保留角色脸、肤色或羽色、体型、姿势、位置和未涉及槽位。小皮试装继承 `CHAR-X`，母鸡试装继承 `CHAR-M`；禁止文字、UI、背景、投影、白边和额外角色。

#### G1 生成与透明化记录

- 生成方式：按 `imagegen` skill 使用内置 `image_gen`，6 件各自独立 identity-preserve 编辑；未使用 CLI/API fallback。完整提示词摘要保存在 `scene-2-wardrobe-g1-prompts-v1.md`。
- 内置工具返回的 6 张原图均为 `1254×1254 RGB`，把棋盘格烘焙进背景，因此不得冒充透明生产图。保留原图作生成记录，另以边界连通的中性棋盘区域做确定性背景提取；主体未重画。
- 审阅用 6 张提取结果均为 `1254×1254 RGBA`，alpha extrema `(0,255)`、四角 alpha 全 0。SHA-256：W01 `BE92B99367C31E85A4A0A5A267BB70516BCF26A706BC0B0FC306A074CD2D00E0`；W02 `6B01916094158E5889461D46753F99DBFCFCCC2882996D25E7C8F930BDA1B7A7`；W03 `43FF0FBE56EB00179DEAF8442764DEFF63D2811010EC8DC1F13BE2EEE73FA677`；W04 `E15DD90DFF02F36068E71348817850C3FE88FB98287BD081687245839B9312D6`；W05 `42A38F45660DBEA870BD5ED51AE6FBAFFC241C1D371E8C6ED962E27074B62351`；W06 `01BCD6BEAF9E55765D658633EFE384FC8DB44E7140B486F1417CAE36DAA86BA2`。
- 总审阅板：`scene-2-wardrobe-g1-review-board-v1.png`，SHA-256 `7B488416DDFF0AC671A35A9A2D0E44447B05B3D24025430538E574307AE3A230`。指标文件 SHA-256 `6F5787176BD36FB1C28103C1716A0F002258C4212AA52E32323500202CF98A20`；提示词集 SHA-256 `F7990F6FFA9E383DA5B5FEC5E59630A7411DF69336AE5376B0CFFD316B7BA9C3`。
- 仓库外目录：`C:/Users/86181/.codex/visualizations/2026/08/11/019ff196-03e8-7661-92d6-b9aa81d1311c/s2-wardrobe-g1/`。爸爸于 2026-09-10 对 W01～W06 回复“没问题，上线吧”，据此全部记为 `G1_APPROVED`，六个逻辑 ID 同时冻结。

#### G2 组合矩阵与锚点冻结

- 场景 2 原角色是压平整身图，若只把衣片覆盖上去会露出旧草帽、裙摆或围兜。本批保留原有 `headLook/outfit/accessory/headwear/neckwear` 槽位和存档 ID，用完整外观矩阵覆盖小皮 12 种、母鸡 4 种合法组合；两个免费默认组合复用原图，其余 14 张进入生产目录。
- 8 个缺失组合按 `imagegen` skill 使用内置 ImageGen 逐张合成，只组合已批准的 W01～W06 造型；提示词集为 `s2-wardrobe-g2-matrix/scene-2-wardrobe-g2-matrix-prompts.md`，SHA-256 `D9BE1091D462DD60CBCCC854EE201C6979D503DEB5C33A08FE23799315EE3EB0`。
- 生成结果只做确定性背景连通提取、孤立 alpha 噪点清除、等比缩放和脚底锚定。14 张生产图均为 `1254×1254 RGBA`，四角 alpha 全 0；小皮可见底线统一 `y=1104`、母鸡统一 `y=1058`，单文件 `797200–944444 bytes`。
- 组合总览 `scene-2-wardrobe-g2-production-matrix-v1.png`，SHA-256 `38048C6547B074DED536E4F162C3EEB3EE1D4F89CC0CE51E45DAB04990DD4199`；机器指标 SHA-256 `34D2D3A2E8BA72D46AF058AE74481CEBCA9421C898CF1A38B9D6A9258EC09339`。仓库外目录：`C:/Users/86181/.codex/visualizations/2026/08/11/019ff196-03e8-7661-92d6-b9aa81d1311c/s2-wardrobe-g2-matrix/`。

#### G3 实景与 G4 生产接入

- 衣柜商店实景：`visual-regression/scene-2-wardrobe-production/scene-2-wardrobe-shop-1194x834.png`，SHA-256 `3FE1E83CE1158AC0F48FDD2514C455CBB22AD9DF52FEBC4BF3BB6A6A26373C99`；六张商品缩略图均完整解码。
- 组合穿戴实景：`visual-regression/scene-2-wardrobe-production/scene-2-wardrobe-equipped-1194x834.png`，SHA-256 `4C546BABFEA9741F13A7ECAF8BBD4B685DBE0781AEB03CBA4CD8008FA00759C9`。最终整场截图：`scene-2-complete-shop-and-wardrobe-equipped-1194x834.png`，SHA-256 `7F5CAAB86599426E836F027620632FB9F4B7292A39D1AAC56869081BA0E5D3F4`，同时包含 9 件收费道具、免费路牌、苹果汁驿站和换装后的两个角色。
- 真实购买从 200 蛋逐件购买六件，准确扣 80、剩余 120；小皮 `headLook` 同槽替换正确，最终同时装备 W02/W03/W04，母鸡同时装备 W05/W06；刷新后五个槽位和余额完整恢复。所有权、重复购买防重、免费换装及 v3 备份事务继续复用现有实现，IndexedDB schema 未升级。
- G4 生产路径为 `public/assets/f4/scenes/scene-2/cosmetics/*.png`，14 个 SHA-256 均登记于 `asset-manifest.json`。2026-09-10 L3 结果：49 个测试文件 / 288 项测试通过，TypeScript、全屏视觉层、视觉引用门禁和 GitHub Pages 构建通过；PWA precache 含全部 14 张新图，真实 `/pipienglish/` 子路径购买、装备、刷新冒烟测试通过。

## 5. 参考包登记

| 参考包 | 身份参考 | 画风参考 | 环境参考 | 构图参考 | 当前缺口 |
|---|---|---|---|---|---|
| `PROP-S1` | 非角色物件，不适用 | `design-samples/assets/rescue-basket-f4.png`、`design-samples/assets/kitchen-f4.png` | `design-samples/assets/farm-background-f3.png` | `visual-regression/stage-g/home-brand-font-single-bg-1194x834.png` | 无 |
| `PROP-S2` | 非角色物件，不适用 | `public/assets/f4/scenes/scene-2/apple-juice-station.png` + 最近的 F4 独立贴图 | `public/assets/f4/scenes/scene-2/orchard-background.png` | 场景 2 1194×834 生产截图 | **G1 前必须定位或补拍，不得用背景代替构图截图** |
| `COS-X-S1` | `design-samples/assets/xiaopi-f3.png` | `design-samples/assets/xiaopi-f3.png` | `design-samples/assets/farm-background-f3.png` | 场景 1 首页 + 衣柜实际 display box | 向日葵种子斜挎包已冻结；需 back/front 遮挡校准 |
| `COS-X-S2` | `public/assets/f4/scenes/scene-2/xiaopi.png` | 同左 | `public/assets/f4/scenes/scene-2/orchard-background.png` | `visual-regression/scene-2-wardrobe-production/scene-2-complete-shop-and-wardrobe-equipped-1194x834.png` | 4 件及 12 种合法组合已上线 |
| `COS-M-S2` | `public/assets/f4/scenes/scene-2/mother.png` | 同左；`design-samples/assets/chick-f3.png` 仅校验同族 | `public/assets/f4/scenes/scene-2/orchard-background.png` | 同上；场景 2 母鸡 `220×220 pt` 实际框 | 2 件及 4 种合法组合已上线 |
| `CHICK-S1` | `design-samples/assets/chick-f3.png` | `design-samples/assets/chick-f3.png` + `docs/reference-images/chick-character-style-reference.png` | `design-samples/assets/farm-background-f3.png` | 场景 1 首页 116×116 display box | 两款主题已冻结；G1 前需分别写允许变化 |
| `CHICK-S2` | `design-samples/assets/chick-f3.png` | `design-samples/assets/chick-f3.png` + `docs/reference-images/chick-character-style-reference.png` | `public/assets/f4/scenes/scene-2/orchard-background.png` | 场景 2 首页 116×116 display box | 场景 2 生产截图需定位；具体款式未定 |

所有路径在逐资产需求单中写为仓库相对完整路径，不允许只写“参考附件”。

## 6. 第二批：扩展目录与系统小物

第二批只有在第一批至少完成生产登记并在儿童界面通过后才开始。

### 6.1 场景 1 已有稳定 ID 的扩展贴纸

| 逻辑 ID | 类型 | 规格 | 层 | 状态 |
|---|---|---|---|---|
| `scene-1-flower-pot` | small | `DEC-S` | `front` | `QUEUED` |
| `scene-1-butterfly-post` | small | `DEC-S` | `front` | `QUEUED` |
| `scene-1-berry-basket` | small | `DEC-S` | `front` | `QUEUED` |
| `scene-1-garden-bench` | medium | `DEC-M` | `actor` | `QUEUED` |
| `scene-1-watering-cart` | medium | `DEC-M` | `actor` | `QUEUED` |
| `scene-1-old-oak-landmark` | landmark | `DEC-L` | `back` | `QUEUED` |

### 6.2 尚需产品先建定义

- 场景 2 的 6 件扩展贴纸已经随 4.6 整批上线。
- 场景 1 其余 5 件扩展装扮：`xiaopi-hair-scene-1-extension`、`xiaopi-hat-look-scene-1-extension`、`xiaopi-outfit-scene-1-extension`、`mother-headwear-scene-1-extension`、`mother-neckwear-scene-1-extension`。
- 场景 2 的 5 件扩展装扮与 1 件核心装扮已经随 4.7 整批上线。
- 鸡舍入口与满员状态、最喜欢星标与第 9 只替换面板、地图入口与当前旅程标记、连胜展示牌、手写小游戏入口木牌。

## 7. 第三批：角色生活与学习/救援

这些资产能显著提升“活起来”的感觉，但不会先于核心目录补齐。

| 队列 | 资产组 | 最小原创状态/帧 | 前置条件 |
|---|---|---:|---|
| `LIFE-MOTHER` | 下蛋、下蛋后开心、慢走左右脚 | 4 | 母鸡动作校准图通过 |
| `LIFE-XIAOPI` | 查看鸡窝、欢迎挥手、任务庆祝 | 3 | 小皮动作校准图通过 |
| `LIFE-CHICK` | 慢走两帧、吃煎蛋、开心转圈四帧、群聊抬头/张嘴 | 8 | 小鸡动作校准图通过 |
| `LEARNING-PROPS` | 听音、描红、选图、默写配套小物 | 4 | 四类学习卡实际构图冻结 |
| `COOKING-STATES` | 生蛋、半熟、完成、飞向小鸡的小尺寸煎蛋 | 4 | 厨房状态时序冻结 |
| `RESCUE-STATES` | 单独探头、跳出篮子 2–4 帧、空篮子 | 4–6 | 救援状态机与显示尺寸冻结 |
| `WORD-ART` | 单词卡插图模板及逐词独立插图 | 按词包 | 先批准 1 张模板校准图，不批量铺词库 |

动作帧必须使用同一角色画布、可见尺寸和脚底基线；换帧不允许跳位。角色装扮暂只覆盖农场首页与衣柜，不能让动作帧生产量在第一批乘法膨胀。

## 8. 接入前逐项登记字段

每个资产进入 production 前必须具备：

- 稳定逻辑 ID、最终文件名、用途、场景、release tier、层级或角色槽位；
- 冻结源文件、原始 SHA-256、派生方式、最终 SHA-256；
- 像素尺寸、色彩模式、alpha bbox、display box、foot/ground/center anchor；
- 身份/画风/环境/构图参考的完整路径与唯一职责；
- `allowed_changes`、`must_preserve`、`must_not_include`；
- G1、G2、G3、G4 的批准材料、批准人和日期；
- 1× iPad 实际尺寸、2× DPR 边缘、目标背景机械合成结果；
- 生产代码映射、`assetStatus=approved`、资产清单、离线预缓存和 1194×834 回归结果。

未完成以上登记的文件，即使视觉上已经选中，也只能停留在候选或校准区。

## 9. 下一步

场景 2 道具商店和完整衣柜已经上线并完成同场验收，当前无待裁决的场景 2 商店美术。场景 1 按爸爸要求继续暂停；下一批可从场景 2 章节异色/特殊小鸡或角色生活动作中另行确定。

## 10. 单一事实源

- 产品核心包与装扮：[`../01-product/FARM_LONG_TERM_ECONOMY_PROPOSAL.md`](../01-product/FARM_LONG_TERM_ECONOMY_PROPOSAL.md) §8–§9
- 当前发布例外：[`../01-product/SPEC.md`](../01-product/SPEC.md) §3.1
- 视觉生产与 G1–G4：[`../02-visual/F4_VISUAL_SYSTEM.md`](../02-visual/F4_VISUAL_SYSTEM.md) §9.1–§10
- 已接入资产与大队列：[`ASSET_BACKLOG_F4.md`](ASSET_BACKLOG_F4.md)
- 贴纸、衣柜和默认装束接口：[`../05-architecture/F7_SCENE_STICKERS_WARDROBE_GATE_AND_TEST_PLAN.md`](../05-architecture/F7_SCENE_STICKERS_WARDROBE_GATE_AND_TEST_PLAN.md)
- 不可覆盖的视觉母版：[`../02-visual/F4_BASELINE_MANIFEST.md`](../02-visual/F4_BASELINE_MANIFEST.md)
- 原始参考图职责：[`../reference-images/README.md`](../reference-images/README.md)
