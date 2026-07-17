---
change_id: F4-CHG-007
date: 2026-07-17
affected_state: farm_home_all_states
affected_files:
  - src/features/farm-f4/visual/FarmHomeDaily.tsx
  - src/features/farm-f4/visual/FarmStageShell.tsx
  - src/styles/f4/design-tokens.css
  - src/styles/f4/home.css
  - src/styles/f4/stage.css
visual_before: A2759 true-device screenshots supplied by dad
visual_after: visual-regression/stage-g/home-brand-font-single-bg-1194x834.png
behavior_change: none
asset_change: reuse approved chick-f3.png as brand medallion; no new asset
approval: dad-approved
---

# 首页品牌、字体与背景拼接修正

## 原因

- 顶栏仍使用 `🐤` emoji，违反孩子可见页面不得使用字符图标占位的视觉契约。
- 正式名称漏掉“の”，与 manifest、PWA 名称不一致。
- A2759 真机系统字体呈现偏细、偏锐，与 F4 圆润水粉画风不协调。
- 固定舞台与外围延展层各自 `cover` 同一背景，在 iPad 状态栏/安全区高度下产生左右竖向拼接缝。

## 改动

- 品牌徽章改用已锁定的本地 `chick-f3.png`，标题统一为“皮皮のEnglish”。
- 字体栈改为 `ui-rounded / Arial Rounded / Yuanti SC` 优先，保留 PingFang 与跨平台回退；正文基础字重提高到 700。
- 农场背景只由 `.f4-bleed` 绘制一次，`.f4-stage` 透明叠加，从结构上消除双层缩放接缝。
- 行为、数据和角色资产均未改变。

## 验证

- 69/69 共享工作区测试通过，GitHub Pages 子路径生产构建通过。
- 1194×834：品牌 PNG、正式名称、字体栈、单背景结构均已检查。
- 1194×800 安全区等效比例：舞台左右各留约 24px，背景连续且无拼接缝。
- A2759 上 `Yuanti SC` 的实际字形与粗细仍需更新部署后复验。
