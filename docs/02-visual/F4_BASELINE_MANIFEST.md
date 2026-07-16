# F4 视觉母版清单

> 建档日期：2026-07-16  
> 状态：**只读锁定**。这些文件共同构成小皮确认的 F4，不得原地覆盖。

## 1. 页面与样式依赖

| 文件 | SHA-256 |
|---|---|
| `design-samples/sticker-f-farm-v4.html` | `EB9D8A95D5922EC4ADEAECD3102126559D57E66A737AAAD7B6078BA7585841FA` |
| `design-samples/sticker-f-farm-v4.css` | `9D347BA100F7184F55A6C035FF6BCCF8F2BCE09E26815C14990B5E8F49895588` |
| `design-samples/sticker-f-farm-v4.js` | `F308B63C92B3EC4871336D65ABB1A473DBBE6AC6005AC864D8ED927F998E96E0` |
| `design-samples/sticker-f-farm-v3.css` | `F1F79944CDF966BE751978159FCABCA6CAF76718AA7455AAFE0E2DD5CB92467C` |
| `design-samples/sticker.css` | `E8066DF1C7F6D1CDC140E6B7F01AAEE96785D4B71B2461CCBF121D2BB07DD6C4` |

F4 会继承 F3 与通用 sticker 样式，因此后三个 CSS 都是母版的一部分；只保存 F4 CSS 无法完整复现。

## 2. 当前接入图片

| 文件 | 像素/模式 | 用途 | SHA-256 |
|---|---:|---|---|
| `design-samples/assets/farm-background-f3.png` | 1501×1048 RGB | 全幅农场背景 | `0E0D54F93BEB79972209AE9AAA7EBED6F4EC9FD9F91A122EEEC0028C7DF546A8` |
| `design-samples/assets/mother-f3.png` | 1254×1254 RGBA | 母鸡常态 | `CFE836C951BBD726486BDE65972F61A0739D667024EF767FFA020DF095CB90BF` |
| `design-samples/assets/xiaopi-f3.png` | 1254×1254 RGBA | 小皮常态 | `30C61F790B2E9A829CC9B26661EE77B4942512D60DB502D2880137A2B6E64637` |
| `design-samples/assets/chick-f3.png` | 1254×1254 RGBA | 小鸡常态 | `B06B82D8BA17A6AAF381E897309E67064C0D09D2E692D34EF1A344C2B97AAAB5` |
| `design-samples/assets/hatchery-empty-f4.png` | 1254×1254 RGBA | 空孵化棚 | `F2C4666F31A1B63AABF57202CDE8FB867B8472112B801A7E0485488639F2AB74` |
| `design-samples/assets/egg-f4-v2.png` | 1254×1254 RGBA | 独立生鸡蛋 | `FBAA203DC4888EA7EBDF504448D402DC3707AD16504398240E081F2AA7BA4C38` |
| `design-samples/assets/kitchen-f4.png` | 1254×1254 RGBA | 空锅厨房面板 | `567D1D386CA5418BFA20B90F9E8CDC13CA3D3C6767EEA32FF352E3DC7D36482F` |
| `design-samples/assets/fried-egg-f4.png` | 1254×1254 RGBA | 独立煎蛋 | `AE569374FFA4B11488B6734D3ECE126388CF46D7C59D152FEF950812CE378601` |
| `design-samples/assets/rescue-basket-f4.png` | 1254×1254 RGBA | 救援小鸡篮 | `B7189C6EA1A4924CE41B088750DE8E607BD9FAEF438F4E265054AACE8D2CC915` |

## 3. 小皮确认的原始参考母图

| 文件 | 像素/模式 | 身份 | SHA-256 |
|---|---:|---|---|
| `docs/reference-images/chick-character-style-reference.png` | 1254×1254 RGB | 小鸡角色造型与画风来源参考 | `3E288BAD92EE827173DC3B533695FB9B25EB5E588A3C54739FE9C70B7110D0B2` |
| `docs/reference-images/pwa-icon-farm-master.png` | 1254×1254 RGB | **小皮确认的 PWA 桌面图标源母图**；农场气质参考 | `652F76E9AEC029E8CC87C063D99CFD8D577FBB461AC9DD854AA9EF7D0E37F721` |

两张图的详细角色、使用限制和预览见 [`../reference-images/README.md`](../reference-images/README.md)。它们与运行时 F4 图片职责不同，但同样不可被同名覆盖。

## 4. 校验命令

在仓库根目录运行：

```powershell
$files = @(
  'design-samples/sticker-f-farm-v4.html',
  'design-samples/sticker-f-farm-v4.css',
  'design-samples/sticker-f-farm-v4.js',
  'design-samples/sticker-f-farm-v3.css',
  'design-samples/sticker.css',
  'design-samples/assets/farm-background-f3.png',
  'design-samples/assets/mother-f3.png',
  'design-samples/assets/xiaopi-f3.png',
  'design-samples/assets/chick-f3.png',
  'design-samples/assets/hatchery-empty-f4.png',
  'design-samples/assets/egg-f4-v2.png',
  'design-samples/assets/kitchen-f4.png',
  'design-samples/assets/fried-egg-f4.png',
  'design-samples/assets/rescue-basket-f4.png',
  'docs/reference-images/chick-character-style-reference.png',
  'docs/reference-images/pwa-icon-farm-master.png'
)
Get-FileHash -Algorithm SHA256 -LiteralPath $files
```

任何哈希变化都必须先查明原因。需要修复 F4 样板时，先复制为新版本并建立新的母版记录。

## 5. 当前明确未锁定的内容

- 随机散步后某一时刻的角色位置；它是运行状态，不是固定构图。
- 浏览器/操作系统对系统字体的细微抗锯齿差异。
- 尚未制作的动作帧、鸡舍、扩建装饰和其他待办资产。
- 正式 React/PWA 的外层 iPad 固定舞台；其行为由 `F4_IPAD_FIDELITY.md` 锁定，代码尚需接入。
- 从 `pwa-icon-farm-master.png` 派生出的 180、192、512 和 maskable 生产图标；本次只锁定了源母图，尚未替换 `public/` 中的现有文件。

## 6. 版本原则

- 历史母版永不覆盖。
- 新图片使用含语义和版本的文件名，例如 `chick-eating-f4-v1.png`。
- 同一图片仅做压缩也视为新二进制版本，必须登记新哈希并通过截图对比。
- 小皮确认了整体变化才建立 F5；局部新增资产仍可标记为兼容 F4，但不得改变已锁定资产。
