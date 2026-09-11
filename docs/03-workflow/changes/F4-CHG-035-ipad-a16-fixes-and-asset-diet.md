---
change_id: F4-CHG-035
date: 2026-09-11
stage: stability-and-assets
affected_state:
  - decorations (placement resolve on write and read)
  - production asset format
production_behavior_change: implemented
approval: dad-approved-2026-09-10 ("把 BUG 和错误以及优化方案一并实施，自查完成后推送上线")
independent_review: not-required
release_gate: full-suite + typecheck + fullbleed guard + assets:check + Pages build + browser smoke
source_of_truth: docs/03-workflow/reviews/2026-09-10-ipad-a16-scene2-shop-audit.md
supersedes: none
visual_owner_review: pending-codex (完成卡新增一行守护卡文案、家长页诊断面板样式)
---

# iPad A16 反馈修复与生产素材瘦身

审查材料见 [2026-09-10 审查清单](../reviews/2026-09-10-ipad-a16-scene2-shop-audit.md)。本记录只登记实际落地的改动。

## 1. 小皮/爸爸真机反馈

| 反馈 | 根因 | 修法 |
|---|---|---|
| 退到桌面音乐还在响 | BGM 播放器只在离开农场页或关开关时暂停;iOS 把还在播的 `<audio loop>` 当后台媒体 | `bgmPlayer.ts` 新增 `onVisibility` 依赖:隐藏即暂停,回前台且开关开着才续播;默认实例监听 `visibilitychange` 与 `pagehide`;单测覆盖 |
| 家长页不能上下滑 | `body { overflow: hidden }` 下家长页只是 `min-height: 100vh` 的流元素,溢出后无人可滚 | `.parent-screen/.parent-gate` 改为 `height: 100%` 的滚动容器,底部留 safe-area |
| 主页最底下一条天蓝横带 | 桌面 PWA 的固定视口铺不到屏幕底边,露出的是 `body` 画布底色 | `html` 画布底色改用 `--f4-canvas`,`FarmStageShell` 按场景写入背景底边草地色(场景 1 `#a0a949`、场景 2 `#a1a63e`);家长页新增「设备诊断」面板输出视口/safe-area/standalone 读数,下一步用真机数字定根因 |
| 装饰物拖到任务卡背后永久点不到 | `placementBounds` 只钳地面锚点,地标/中型物件显示框可整张落在 z 65 的卡片后;右下按钮组同理 | `farmCustomization.ts` 新增 `resolveDecorationHome`:松手、`placeDecoration` 落库、VM 读取旧存档三处共用,推出 `DAILY_BOARD_KEEPOUT` 与新增的 `CUSTOMIZATION_ENTRANCE_KEEPOUT`;网格全覆盖单测 |
| 「摆出来」全叠在一点、只有最上面能拖 | 初始落点固定为范围中心 | `initialDecorationHome` 从中心向两侧上下逐圈找不与已摆放物件重叠的位置 |
| iPad 按住图片弹菜单打断拖动 | 无 `-webkit-touch-callout: none` | `.f4-home img` 统一关闭长按与原生拖拽 |
| 回访场景 1 出现场景 2 衣柜,穿上没变化 | 衣柜目录列出所有已进入场景的装扮 | 只列正在查看的场景自己的装扮;所有权仍全局 |
| 每次松手贴纸闪一下 | `key` 含坐标导致重挂 `<img>` | key 改为 itemId,落点变化用 effect 同步 |

## 2. 生产素材瘦身(首次打开慢 / 贴图丢失的根)

- 56 张母版 PNG 从 `public/assets/f4/**` 移入 `design-samples/assets/f4-production-masters/**`(git 重命名,母版只读)。
- `scripts/optimize-f4-assets.py` 派生生产 WebP(q82,Lanczos 缩到显示框 2×:小鸡 400、鸡窝 512、角色/衣柜 640、装饰 680、驿站 800,背景保持原尺寸),重写 `asset-manifest.json`(schema 2:产物 sha256 + 母版 sha256 + 像素);`--check` 校验。
- 离线包:68 文件 58.2 MB → 57 文件约 3.1 MB;`vite.config.ts` glob 加入 `webp`。
- `f4AssetUrl` 把 `.png` 逻辑 ID 映射为 `.webp`;领域层 assetId、存档、文档里的 ID 全部不变。`stage.css` 不再写死场景一背景(场景二冷启动少下 2.2 MB、不再先闪晴空农场)。
- QA 脚本的 `naturalWidth === 1254` 断言改为「已加载且为正方形」。
- 视觉复核:风车、小皮组合图在 680/640 px 下与母版无可见差异(Read 目检);由 Codex 在真机再看一遍。

## 3. 门禁

- `npm run check` 只剩全屏视觉层守卫;`check:visual-references` 保留为独立脚本,美术任务前手动跑。
- CI 去掉独立的 check 步骤(build 内部仍跑守卫)。
- `EXECUTION_BUDGET_POLICY.md` §3 改为「直接推 main」,新增 §3a hotfix 通道。

## 3a. 2026-09-11 下午追加(爸爸看真机截图后:「还是有个条」「装饰贴图无法拖动」「拖动范围扩大到整个首页」)

家长页设备诊断读数:innerHeight 788、屏幕 820、safe-area top 32 / bottom 20、standalone、iPadOS 26(Safari 26.6.1)。

| 反馈 | 根因 | 修法 |
|---|---|---|
| 底部横带还在,而且还是天蓝 | iPadOS 26 在 `black-translucent` 下把状态栏高度 32pt 从布局视口里扣掉却仍把内容画到状态栏下面,底部 32pt 没有任何页面内容;WebKit 的页面外延背景色 = html 与 body 背景叠加,body 不透明的天蓝盖掉了 html 的草地色 | `index.html` 状态栏改回 `default`(WebView 排在状态栏下方、贴到屏幕底边),`theme-color` 与 manifest `theme_color` 改为天空色 `#bfe5f7` 让状态栏与背景顶部衔接;`body` 背景也走 `--f4-canvas`;家长页把画布设为自己的米色 |
| 装饰贴图无法拖动(iPad) | 贴纸按钮里的 `<img>` 直接接收触摸,iPadOS 把以图片为目标的触摸当成图片拖拽/长按而取消 pointer 序列;小鸡/鸡窝的图片一直是 `pointer-events: none` 所以没事 | `.farm-decoration-f7 img { pointer-events: none }`;苹果汁驿站、路牌这类场景固定装置本来就不可拖,现在也做成可拖动(`StageDraggable` 接受任意 id + 布局,落点按场景保存在 `scene-element-homes:<scene>`) |
| 拖动范围太小 | 母鸡/小皮限 y ≥ 300,鸡窝/救援框 y ≥ 180,小鸡 y ≥ 300,贴纸只能放在下半场 | 统一为 `STAGE_DRAG_INSETS`(8/80/8/4):整个首页可拖,只不进顶部工具栏;贴纸 `placementBounds` 由显示框推导覆盖全舞台;小鸡散步区跟着落点走并避开任务卡/按钮组;「摆出来」起点放在下半场草地 |
| 今天(DAY 38)还是旧的 6 复习 0 新词 | 当天会话在更新前已由旧规则建好,新代码只在会话不存在时才建 | `clockGuard` 对「还没答过题」的会话按当前规则重排(并清掉空的课程断点);答过一题就不再动 |

验证:vitest 49 文件 304/304;浏览器 1180×820:路牌、母鸡、异色小鸡都能拖到顶部工具栏正下方(y=80),三种稀有度小鸡 WebP 全部正常渲染,守护卡文案正常。

## 3b. 2026-09-11 晚追加(爸爸:「还是有个条,只是从蓝变绿」+ 批准优化建议 5–8)

- **横带根治**:`apple-mobile-web-app-status-bar-style` 在添加到主屏幕时被 iOS 固化,改 meta 对已安装的 App 无效(下午改 `default` 完全没生效,已改回 `black-translucent`)。新做法:`src/features/pwa/viewportShortfall.ts` 在 standalone 且 innerHeight 比屏幕高度矮 ≤64pt 时,把 `--f4-doc-height` 设为真实屏幕高度,`html/body/#root/.f4-viewport` 都用它,背景层直接铺过底部那 32pt;舞台仍由 safe-area 避开状态栏与 Home 指示条。诊断面板新增该变量读数。
- **写词第一轮 2 颗蛋**:见 F4-CHG-034 裁决 5。
- **家长页周报**:最近 7 天完成天数、新词、复习、游戏得蛋、待救援,以及按 FSRS 忘记次数排的最容易忘的 5 个词。
- **视觉小修**:孵化倒计时标签上移 5pt;中层贴纸与角色同一层叠上下文、按脚底 y 排前后(`depthZIndex`,20–40);角色贴近顶栏时气泡翻到身体下方。
- **按场景独立穿戴**:`kv.sceneLoadouts[sceneId]`,装备/卸下只改当前查看场景;旧全局 `kv.loadout` 若穿着某场景的装扮就归入该场景(小皮已穿的场景 2 衣服不丢);备份随 kv 整体导入导出。
- **主包拆分**:学习流、救援、写词、家长页与 DEV 预览按路由 `React.lazy`,主包只装农场;分包由 Service Worker 一并预缓存。

## 4. 未做(留给后续)

- 分层角色母版(替代场景 2 的 16 张组合图):美术生产,另立任务。
- 底部横带根因已由诊断面板读数确认并在 §3a 处理;若 `default` 状态栏在 iPadOS 26 上仍留缝,画布底色兜底为草地色。

## 5. 验证

见 `progress.md` 2026-09-11 段与提交正文:tsc、vitest、`npm run check`、`npm run assets:check`、`GITHUB_PAGES=true npm run build`、浏览器 1180×820 实测。
