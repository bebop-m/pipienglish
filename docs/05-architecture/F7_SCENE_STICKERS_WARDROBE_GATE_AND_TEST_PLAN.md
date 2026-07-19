# 框架 7：场景贴纸与角色衣柜发布边界、契约与验证记录

> 状态：场景 1 底层机制完成；正式视觉内容等待批准与打包
> 日期：2026-07-19

## 当前发布边界

- 生产内容包 `FARM_SCENE_DEFINITIONS` 只包含场景 1，因此 `availableChapter` 的生产值为 1；场景 2 仅保留在 `FUTURE_FARM_SCENE_DRAFTS`，不会解锁，也不会出现在地图。
- 场景 1 已定义完整贴纸经济：4 小 × 5、3 中 × 10、2 地标 × 20，总价 90。当前九项均为稳定逻辑 ID 的 `internal-placeholder`，不会进入儿童正式目录或产生图片节点。
- 场景 1 已定义完整衣柜经济草案：小皮 `headLook/outfit/accessory`、母鸡 `headwear/neckwear`，六件总价 80。生产批准目录当前为空，未到货扩展项不会显示锁定剪影。
- 框架 8 阶段 A 图片没有接入、复制或渲染。首页继续使用已批准的 `xiaopi-f3.png` 与 `mother-f3.png` 标准造型；学习页、结束页不消费 loadout。
- `includeInternalPlaceholders` 只供显式测试/开发契约使用，生产默认恒为 `false`。

## 数据与事务契约

- 贴纸所有权与摆放状态复用 Dexie v3 `decorations` 表，唯一键为 `[sceneId+itemId]`；`x/y=null` 表示已拥有但已收起。
- 首次购买在同一事务写入唯一所有权行并扣蛋。重复点击返回 `already-owned` 且不扣蛋；事务任一写入失败时整体回滚。
- 移动、收起、再摆放均免费；坐标必须位于商品自己的 `placementBounds`，商品 ID 不能跨场景复用。
- 装扮永久所有权使用 `cosmetics` 表；装备态使用唯一 `kv.loadout`。购买与装备分离，装备、替换、卸下和跨场景读取免费。
- 角色、槽位和所有权在写入 loadout 前校验；小皮必需槽卸下时回到批准的标准造型逻辑 ID。
- v3 手动备份同时保存并恢复 decorations、cosmetics 与 loadout。

## 渲染契约

- 贴纸持久化点是 1194×834 首页舞台中的 ground point。每项定义固定透明画布尺寸、展示框、ground anchor、`back/actor/front` 层和放置范围。
- 首页已设置三层贴纸容器，但只为 `assetStatus=approved` 的已摆放条目创建图片节点。
- 衣柜已有分层容器技术闭环，但只渲染批准层；`internal-placeholder` 不生成图片或剪影。
- 当前批准角色层仅有压平标准造型：小皮 252×274、脚底锚点 `(627,1104)`；母鸡 220×220、脚底锚点 `(622,1058)`；源画布均为 1254×1254。

## 框架 8 阶段 B 可消费接口

阶段 B 可在资产批准和离线打包后提供 `CharacterLayerAssetDefinition[]`：

- 每层包含稳定 `logicalId`、打包后的 `assetId`、`assetStatus=approved`、角色、角色层职责、顺序和完整 anchor。
- 同一角色的所有层必须使用完全一致的 canvas、foot anchor 与 display box；`stableCharacterLayers` 会拒绝锚点漂移的层并按 `order` 排序。
- 小皮可提供 back/body/outfit/front/headLook/accessory，母鸡可提供 body/neckwear/headwear 的 back/front 分层；移动、缩放和镜像只施加到整组。
- 批准层进入 `APPROVED_STANDARD_CHARACTER_LAYERS` 或后续批准清单前，儿童首页和衣柜不会消费该图片。

## 自动化覆盖

- 场景 1 数量、价格、核心/扩展分离、生产场景封口和技术锚点。
- 并发重复购买、余额不足、事务回滚、免费移动/收起/再摆放、越界拒绝和跨场景坐标隔离。
- 装扮永久所有权、免费装备、非法角色/槽位、所有权与 loadout 分离。
- v3 导出/恢复后的贴纸所有权与坐标、装扮所有权和装备态。
- 角色锚点稳定、贴纸 ground point 转换，以及生产界面过滤全部未批准内容。
