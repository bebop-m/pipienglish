# 框架 7：场景贴纸与角色衣柜发布边界、契约与验证记录

> 状态：最新产品与架构规则已由爸爸确认定稿；场景 1 底层机制完成，正式视觉内容仍须通过批准与打包门禁
> 日期：2026-07-19
> 美术校准补充：2026-07-22
> 合并关系：产品总规则同步至 [`FARM_LONG_TERM_ECONOMY_PROPOSAL.md`](../01-product/FARM_LONG_TERM_ECONOMY_PROPOSAL.md) §5、§8–§9 与 [`SPEC.md`](../01-product/SPEC.md) §3.1；视觉生产必须同时遵守 [`F4_VISUAL_SYSTEM.md`](../02-visual/F4_VISUAL_SYSTEM.md) §9.4。

## 当前发布边界

- 生产内容包 `FARM_SCENE_DEFINITIONS` 已包含场景 1 与场景 2，因此 `availableChapter` 的生产值为 2；场景 2 在第 36 个完成日后按既有庆祝与顺序旅行流程解锁。下一批未冻结场景继续留在空的 `FUTURE_FARM_SCENE_DRAFTS`，不会产生空白入口。
- 场景 1 已定义完整贴纸经济：4 小 × 5、3 中 × 10、2 地标 × 20，总价 90。当前九项均为稳定逻辑 ID 的 `internal-placeholder`，不会进入儿童正式目录或产生图片节点。
- 场景 1 已定义完整衣柜经济草案：小皮 `headLook/outfit/accessory`、母鸡 `headwear/neckwear`，六件总价 80。生产批准目录当前为空，未到货扩展项不会显示锁定剪影。
- 每个场景必须有一套**免费、适配该场景主题的小皮默认装束**：场景 1 使用草帽与蓝背带裤基准，从场景 2 起随每个新场景核心包额外交付。它是场景基础呈现，不是衣柜商店中的付费“主题角色装扮”，二者不得共用计价或所有权语义。场景 2 苹果园已发布批准的“砖红果园裙装与奶油围裙＋带单个小苹果和叶片的草帽”完整基准图；后续衣柜分层扩展必须以该基准校准，不能改变当前身份和比例。
- 场景 1 首页继续使用已批准的 `xiaopi-f3.png` 与 `mother-f3.png` 标准造型；场景 2 首页使用已批准的苹果园小皮与母鸡基准图。学习页、结束页暂不消费 loadout。
- `includeInternalPlaceholders` 只供显式测试/开发契约使用，生产默认恒为 `false`。

## 数据与事务契约

- 贴纸所有权与摆放状态复用 Dexie v3 `decorations` 表，唯一键为 `[sceneId+itemId]`；`x/y=null` 表示已拥有但已收起。
- 首次购买在同一事务写入唯一所有权行并扣蛋。重复点击返回 `already-owned` 且不扣蛋；事务任一写入失败时整体回滚。
- 移动、收起、再摆放均免费；坐标必须位于商品自己的 `placementBounds`，商品 ID 不能跨场景复用。
- 装扮永久所有权使用 `cosmetics` 表，所有已购装扮可在任何场景免费选用；“当前穿了什么”则按 `sceneId` 独立保存在 `kv.sceneLoadouts`。在一个场景中装备、替换或卸下只改该场景记录，不得改动其他场景的穿戴状态。
- 场景默认装束属于场景定义，不写入 `cosmetics`、不制造虚假所有权，也不扣蛋。某场景没有已保存穿戴记录时，以该场景默认装束初始化；此后每次进入都恢复该场景上次离开时的穿戴，不携入刚刚离开场景的任何穿戴选择。
- 角色、槽位和所有权在写入场景 loadout 前校验；选择“恢复默认”时，只将**当前场景**恢复为该场景批准的默认装束逻辑 ID 组合，不影响任何其他场景。
- v3 手动备份同时保存并恢复 decorations、cosmetics 与按场景分开的 sceneLoadouts。旧版唯一 `kv.loadout` 升级时归入场景 1；其他场景首次进入时仍从各自默认装束初始化。

## 渲染契约

- 贴纸持久化点是 1194×834 首页舞台中的 ground point。每项定义固定透明画布尺寸、展示框、ground anchor、`back/actor/front` 层和放置范围。
- 首页已设置三层贴纸容器，但只为 `assetStatus=approved` 的已摆放条目创建图片节点。
- 衣柜已有分层容器技术闭环，但只渲染批准层；`internal-placeholder` 不生成图片或剪影。
- 当前批准角色层仅有压平标准造型：小皮 252×274、脚底锚点 `(627,1104)`；母鸡 220×220、脚底锚点 `(622,1058)`；源画布均为 1254×1254。
- 新场景小皮默认装束不得重新压平成单张角色图，也不得画死进背景或 `body`。身份身体底图继续独立；场景服装分别落入 `headLook`、`outfit`、`accessory` 槽，并按遮挡需要交付 `back/front` 子层。场景 2 中，草帽与帽下配套头发属于 `headLook`，砖红裙装、奶油围裙和衬衣属于 `outfit`，默认 `accessory=null`。
- 场景 1 的 F4 独立鸡蛋模型只保留为旧场景兼容实现。从场景 2 起，每个新场景必须按该场景鸡窝的造型生成并冻结自己的完整孵化状态贴图组，不复用 F4 鸡蛋、裂纹或蛋壳源图，也不在运行时把独立鸡蛋机械叠到空窝上。

## 框架 8 阶段 B 可消费接口

阶段 B 可在资产批准和离线打包后提供 `CharacterLayerAssetDefinition[]`：

- 每层包含稳定 `logicalId`、打包后的 `assetId`、`assetStatus=approved`、角色、角色层职责、顺序和完整 anchor。
- 同一角色的所有层必须使用完全一致的 canvas、foot anchor 与 display box；`stableCharacterLayers` 会拒绝锚点漂移的层并按 `order` 排序。
- 小皮可提供 back/body/outfit/front/headLook/accessory，母鸡可提供 body/neckwear/headwear 的 back/front 分层；移动、缩放和镜像只施加到整组。
- 每个可发布场景还必须提供场景级默认装束映射：`sceneId -> { headLook, outfit, accessory }`。映射只引用已批准的稳定逻辑 ID；任一必需槽缺失、未批准、锚点不一致或仍为压平占位图时，该新场景不得进入生产解锁目录。
- 每个新场景提供自己的 `hatcheryVisualStates[]`：每项包含稳定状态 ID、该场景完整鸡窝贴图 `assetId`、批准状态，以及需要时的 `remainingMsMin/remainingMsMax`。空窝、完整蛋、各开裂阶段、破壳和出壳结果均引用该场景自己已批准的整张贴图。
- 批准层进入 `APPROVED_STANDARD_CHARACTER_LAYERS` 或后续批准清单前，儿童首页和衣柜不会消费该图片。

## 自动化覆盖

- 场景 1 数量、价格、核心/扩展分离、生产场景封口和技术锚点。
- 并发重复购买、余额不足、事务回滚、免费移动/收起/再摆放、越界拒绝和跨场景坐标隔离。
- 装扮永久所有权、免费装备、非法角色/槽位、所有权与 loadout 分离。
- 每个生产场景都有独立、免费的默认小皮装束映射和独立 sceneLoadout；首次进入使用场景默认，换装后只保存到当前场景，切换场景时不携带上一场景的穿戴，返回时恢复该场景上次选择，“恢复默认”也只影响当前场景。
- 场景默认装束按 `body/headLook/outfit/accessory` 与必要的 `back/front` 分块渲染；缺层、错序、跨槽压平、canvas/foot anchor/display box 漂移都会阻止场景发布。
- 每个新场景的 `hatcheryVisualStates` 覆盖空窝、完整蛋、全部批准剩余时间分段、破壳和需要的出壳结果；分段无重叠/空洞，状态切换时鸡窝轮廓、画布、display box 和放置位置不跳动，且完全不依赖 F4 独立鸡蛋叠层。
- v3 导出/恢复后的贴纸所有权与坐标、装扮所有权和各场景独立装备态；旧全局 loadout 升级后只进入场景 1。
- 角色锚点稳定、贴纸 ground point 转换，以及生产界面过滤全部未批准内容。
