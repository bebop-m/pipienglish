---
change_id: F4-CHG-028
date: 2026-07-19
stage: post-launch-fixes
affected_state:
  - stage_shell
  - overlay_dimming
  - backup_clock
production_behavior_change: shipped
approval: dad-requested
implemented_by: claude
visual_owner_review: pending-codex
---

# 全屏视觉层契约：根治背景上的矩形接缝

## 1. 现象与根因

爸爸反馈：背景上有一圈「比背景框架略小的半透明阴影」，且 Codex 之前修过一次又复发。

**根因是架构层面的，不是某处样式写错。** 舞台 `.f4-stage` 是固定 1194×834 的坐标系，按设备缩放后 letterbox 居中；而背景图由 `.f4-bleed` 铺满**整个视口**。于是任何意在「盖住整个屏幕」的着色层，只要画在舞台里，letterbox 露出的背景就不会被它覆盖，屏幕上必然出现一圈矩形边。

命中两处：

| 层 | 位置 | 效果 |
|---|---|---|
| `.f4-home::before` | 采光渐变（顶部 12% 白、底部 6% 墨绿） | 常驻可见的矩形边 |
| `.panel-backdrop-f4` | 面板遮罩 `rgba(61,48,38,.17)` + 模糊 | **爸爸截图里的那圈「半透明阴影」**（截图中鸡蛋篮面板处于打开状态） |

实测（1420×870 视口）：舞台渲染 1246×870，左右各 87px letterbox 未被遮罩覆盖。

Codex 上次修的是另一件事（`2006ec1` 背景被画两遍的拼接缝），把舞台背景改成透明，但没有处理这两个叠加层，所以问题换个形式回来了。

## 2. 修复：确立全屏视觉层契约

**契约：凡是意在盖住整个屏幕的着色，一律画在 `.f4-bleed`（视口层）；舞台里只允许放会被 1194×834 裁切的内容。**

- 采光渐变 `.f4-home::before` → `.f4-viewport[data-surface='farm'] .f4-bleed::before`，随背景一起铺满视口；仅农场启用，学习页不受影响。
- 面板遮罩：`.panel-backdrop-f4` 只保留「点空白处关闭」的命中区（`background: transparent`），压暗改由 `.f4-viewport[data-dimmed='true'] .f4-bleed::after` 在视口层完成。
- `FarmStageShell` 新增 `surface` / `dimmed` 两个入参，落到 `.f4-viewport` 的 `data-*` 上；`FarmHomeScreen` 用 `DIMMING_OVERLAYS` 集合驱动 `dimmed`，与实际铺命中区的 overlay 一一对应（`hatchery_pop` / `rescue_pop` 是就地小气泡，不压暗）。

**一个实现陷阱已规避：** 压暗层最初写成 `opacity: 0` + 过渡，实测过渡卡在 0 永不显示——`backdrop-filter` 叠加 `opacity: 0` 时浏览器会跳过合成。改为由 `data-dimmed` 直接生成该层（原遮罩本来也是瞬时出现的）。守卫脚本已把这条钉死。

**实测（面板打开，1420×870 视口）：** 压暗层 1420×870 = 整个视口，完整覆盖左右各 87px 的 letterbox；面板关闭时该层 `content: none`，完全不生成。1366×1024 下同样成立。

## 3. 根治：构建门禁

`scripts/check-fullbleed-layers.mjs`，接入 `npm run build`（也可单独跑 `npm run check:fullbleed`）。违规**直接挡住构建与部署**，比测试更硬。

检查两类：

1. **舞台内的全屏着色层**——扫描所有 F4 样式表，找出「铺满舞台根且着色」的规则。舞台根 = 显式写 1194×834 的屏幕容器，外加 `.f4-home` / `.f4-stage__content`。只针对铺满舞台根的层，铺满进度条、纸卡等小容器的 `inset: 0` 是正常写法，不误报。
2. **结构不变量**——`.panel-backdrop-f4` 必须保持透明；`stage.css` 必须有 `data-dimmed` 压暗层；该层不得用 `opacity: 0` 起始。

守卫本身也做了防空跑保护（样式表或规则解析为空即失败）——早先的 vitest 版本因 Vitest 默认桩掉 CSS 导入而在扫空字符串，是**假通过**，故改为 Node 脚本。

已验证：当前通过（扫描 9 个样式表 / 617 条规则）；故意重新引入 `.f4-home::after` 全屏着色 → 拦截并指名到具体规则；故意让 `.panel-backdrop-f4` 恢复着色 → 拦截。

**这是「新建场景不再复发」的保障**：每章新场景都有自己的背景，若为其加夜景色调、季节滤镜等全屏处理，守卫会在构建时就拦下并给出修法。

## 4. 顺带修复：备份测试的时间炸弹

跑回归时发现 `backup.test.ts` 的 v1 用例失败（期望 8 只鸡、实得 11）。与本次改动无关，是**测试自身的定时炸弹**：v1 夹具的待孵蛋按「当天」结算，而 `importAll` 硬编码 `Date.now()`。夹具里 `2026-07-19` 那批 3 颗蛋，在当天尚未孵化，一旦真实时钟跨过该日就全部被判为已孵化（6+2+3=11）。

`importAll(db, json, clock?)` 增加可注入时钟（默认仍为真实时钟，生产行为不变），测试钉死在 `2026-07-19`。否则从今天起每次构建都会失败。

## 验证

- vitest：42 文件 / 232 测试通过。
- `npm run build`：守卫通过 → tsc → vite build，预缓存 22 项。
- 浏览器实测 1420×870 与 1366×1024 两种宽高比下的 letterbox 覆盖；学习页确认不带农场采光层与压暗层。

## 待办

- Codex 复核采光渐变移到视口层后的观感（渐变现在按视口高度分布，而非舞台高度）。
- 真机确认 iPad Safari 带地址栏时的表现（该场景 letterbox 最明显）。
