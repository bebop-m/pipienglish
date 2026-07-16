# F4 原始参考图登记

这两张图是项目的长期参考资料，不是临时附件。文件已从 Downloads 无损复制到仓库，并改用稳定的英文文件名；原始内容没有裁切、缩放或重新压缩。

## 1. 小鸡角色造型参考板

![小鸡角色造型参考板](chick-character-style-reference.png)

- 文件：[`chick-character-style-reference.png`](chick-character-style-reference.png)
- 原始文件名：`ChatGPT Image 2026年7月16日 15_10_58.png`
- 尺寸/模式：1254×1254，RGB PNG
- SHA-256：`3E288BAD92EE827173DC3B533695FB9B25EB5E588A3C54739FE9C70B7110D0B2`
- 身份：**角色造型与画风来源参考**。
- 使用方式：用于校验小鸡的圆润比例、粗深色手绘轮廓、极简五官、腮红、柔和黄色水粉上色和可爱姿势。
- 限制：它是一张三格参考板，不直接作为运行时角色贴图；正式动作仍以当前 F4 的 `design-samples/assets/chick-f3.png` 为直接身份母图。

## 2. 农场小鸡图／PWA 图标源母图

![小皮确认的 PWA 图标源母图](pwa-icon-farm-master.png)

- 文件：[`pwa-icon-farm-master.png`](pwa-icon-farm-master.png)
- 原始文件名：`ChatGPT Image 2026年7月16日 15_10_49.png`
- 尺寸/模式：1254×1254，RGB PNG
- SHA-256：`652F76E9AEC029E8CC87C063D99CFD8D577FBB461AC9DD854AA9EF7D0E37F721`
- 身份：**小皮已经决定采用的 PWA 桌面图标源母图**，同时也是农场环境与小鸡关系的重要原始参考。
- 图标规则：主体、倾斜角度、表情、农场构图、圆角画面和颜色关系不可重新设计。生成 `apple-touch-icon.png`、192×192、512×512 和 maskable 版本时，只允许按平台安全区做尺寸派生；不得让生成式 AI 重画。
- 当前状态：源母图已锁定归档；项目 `public/` 中现有图标尚未在本次文档整理中替换，后续应单独执行“无损尺寸派生 + iPad 主屏幕真机检查”。

## 参考优先级

- 新角色动作：当前 F4 对应角色资产负责身份一致性，本目录参考图负责防止画风漂移。
- 新农场或装饰：当前 F4 背景负责实际色温和材质，本目录农场图负责最初的构图气质。
- PWA 图标：`pwa-icon-farm-master.png` 是唯一源母图，优先级高于现有临时 `public/icon-*.png`。

