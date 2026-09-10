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

## 4. 未做(留给 Codex / 后续)

- 孵化倒计时标签仍贴舞台底边、压鸡窝 17px(Codex 视觉)。
- 中层装饰永远在角色后面(深度排序未做)。
- 按场景独立穿戴(`kv.sceneLoadouts`)与分层角色母版:架构债,另立任务。
- 底部横带根因待家长页诊断面板读数确认;画布底色只是兜底。

## 5. 验证

见 `progress.md` 2026-09-11 段与提交正文:tsc、vitest、`npm run check`、`npm run assets:check`、`GITHUB_PAGES=true npm run build`、浏览器 1180×820 实测。
