# F4-CHG-005 — 阶段 F 首页三状态与 Pages 资产修复

```yaml
change_id: F4-CHG-005
date: 2026-07-17
scope: first-visit-daily-complete-pages-assets
source_visual: design-samples/sticker-f-farm-v4.html
master_files_modified: false
target_device: iPad Pro 11-inch A2759 landscape
deployment: pending_combined_push
```

## 线上 PNG 故障与修复

- 故障不是 PNG 文件损坏，而是 React JSX 使用 `/assets/f4/...` 根绝对地址；GitHub Pages 部署在 `/pipienglish/` 子路径后，请求错误落到 `https://bebop-m.github.io/assets/...` 并返回 404。
- 新增 `publicAssetUrl` / `f4AssetUrl`，所有 JSX 图片统一消费 `import.meta.env.BASE_URL`。本地根部署继续使用 `/assets/...`，Pages 生产包使用 `/pipienglish/assets/...`。
- CSS 背景仍由 Vite 构建器按 `base` 重写。没有修改或重新压缩任何 F4 PNG，也没有修改母版。
- 增加根部署、Pages 子路径和尾斜杠归一化三项单元回归。

## 阶段 F · `first_visit`

- 首次启动直接进入孩子可见的正式 F4 农场，不再显示内部开发壳；数据水合期间保持舞台空白，避免 `DEV PLACEHOLDER` 闪现。
- 只保留母鸡、小皮、低权重的动效/家长入口；鸡蛋、孵化棚和救援入口在起名前不出现。
- 起名使用场景左上方的奶油纸名牌，而不是居中弹窗。支持空值提示、8 字上限、回车提交、重复提交保护和保存失败反馈。
- 起名成功后通过原有 `NAME_HEN` 事件刷新 VM，立即进入 `daily_incomplete`。

## 阶段 F · `daily_complete`

- 今日任务板替换为常驻连胜展示牌，显示连胜、新词、复习和所得鸡蛋；完成态按已完成契约显示当日完整新词数。
- 新增简单直接的场景木牌入口“玩一轮写词游戏”，副文案固定为“10 题 · 完成可得煎蛋”。
- 新增 `OPEN_HANDWRITING_GAME` 导航意图；手写游戏页面本体仍按逐屏计划后续接入。
- 完成态继续保留鸡蛋分配、孵化棚、救援篮、角色互动、动效开关与家长入口。
- 纸牌和木牌当前使用 CSS 场景物件实现，不伪造未审批 PNG；P0 位图资产完成后可在不改 VM/事件契约的前提下替换外观。

## 动效与可访问性

- 输入与按钮均有稳定标签、焦点轮廓、按压即时反馈；提交失败不会让表单永久锁死。
- 新状态沿用全局“减少动态”和应用内动效开关，未增加闪烁或满屏粒子。
- 图片保留语义化替代文本；纯装饰图片继续空 `alt`。

## 验证

- 本次待推送基线：Vitest 42/42 通过；共享工作区中另有 Claude 正在整理、未纳入本次提交的词库/课程测试。
- TypeScript、Vite、PWA 生产构建通过。
- `GITHUB_PAGES=true` 构建确认 JS 资产基址为 `/pipienglish/`，不存在 `"/assets/f4/` 根绝对 JSX 地址。
- Pages 子路径生产预览：背景 URL 为 `/pipienglish/assets/f4/farm-background-f3.png`；母鸡、小皮及日常/完成态所用 PNG 均完成解码，透明图 `naturalWidth=1254`。
- 1194×834 A2759 等效横屏浏览器：首次起名 → 日常态、完成态、写词入口事件通过；console 0 error / 0 warning。

## 仍待后续锁定

- V-3 的正式 PNG 连胜牌/木牌与动作组仍需按资产协议制作并由小皮确认；本次 CSS 版本是可上线、可替换的工程候选，不登记为 F4 位图基准。
- 手写游戏页未在阶段 F 实现；当前只交付首页解锁入口与导航事件。
- 多尺寸范围仍锁定 A2759 横屏；IP-13、竖屏和 Split View 的扩展适配按既有记录留到完整版上线后。
