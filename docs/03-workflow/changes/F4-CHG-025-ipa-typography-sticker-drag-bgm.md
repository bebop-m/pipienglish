---
change_id: F4-CHG-025
date: 2026-07-19
stage: post-launch-fixes
affected_state:
  - lesson_intro_typography
  - decorations
  - settings
  - audio
production_behavior_change: shipped
approval: dad-requested
implemented_by: claude
visual_owner_review: pending-codex
release_gate: none
---

# 音标排版修复、贴纸拖拽与背景音乐基础设施

爸爸 2026-07-19 反馈三项，Codex 本周额度用尽，由 Claude 直接落地。

## 1. 跟读页音标字体与间距（生产行为变更）

**现象：** 无插图学习卡（`text_first` 变体）里，单词与下方音标/释义几乎贴在一起；音标字形观感不对。

**根因（实测）：**

- `.lesson-word-line-f4 h1` 的 `line-height: .98` 在 86px 字号下使行盒矮于字形，`grape` 等含 p/g/y 降部的单词墨迹伸出行盒；
- `.lesson-word-stage-f4` 变体的 `.lesson-word-details-f4` 没有上边距——原有间距规则只写给了 `.lesson-word-block-f4`（有插图变体），无插图变体漏掉。

两者叠加，浏览器实测降部**侵入下方细节行 18px**。

**修复：** 行高放宽至 `1.05`；无插图变体细节行补 `margin-top: 30px`。修复后同一测量口径下净空 `+15px`，纸张底部仍余 58px，不挤压例句卡与主按钮。

**音标字体：** 词库数据本身无误（`grape` 存 `/ɡreɪp/`，标准 IPA 开尾 ɡ U+0261）。观感问题源于 `--f4-font` 圆体展示字体不含 IPA 扩展区字形，浏览器逐字回退导致混排。`.lesson-ipa-f4` 改用 `system-ui` 栈（SF Pro / Segoe UI 均完整覆盖 IPA），字重 750 → 500。

## 2. 已摆放贴纸可手动拖动（能力就绪，等美术）

领域侧此前已具备条件：`DecorationPlacement` 持久化 x/y、`PLACE_DECORATION` 事件带坐标、`placementBounds` 约束、最终裁决明确"可反复移动不重复收费"。缺口只在交互层——原实现只能点"摆出来"落到范围中心。

- 新增 `clampPointToPlacementBounds`（纯函数）：把落点钳回允许范围，保证提交坐标必然通过 `placeDecoration` 守卫。
- `FarmDecorations` 的每件已摆放贴纸改为可拖拽按钮，复用 `FarmActors` 的指针模式（8px 移动阈值防误触、`setPointerCapture`、`touch-action: none` 防 iPad 拖动时页面滚动）；松手经 `PLACE_DECORATION` 免费持久化，未超过阈值视为点击不写库。
- 深度 `--f7-depth-key` 随落点 y 实时更新，前后遮挡关系跟手。

**注意：** 场景 1 全部 9 件贴纸目前仍是 `internal-placeholder`，生产端被 `assetStatus` 门控过滤，因此该能力在正式贴纸（框架 8 第 2 阶段）交付前对小皮不可见。本次以纯函数往返测试覆盖。

## 3. 背景音乐基础设施（小皮需求，曲目待验收）

小皮要求"舒缓解压轻快的背景音乐"。本次落地全部基础设施，**曲目本身按项目规矩需经小皮验收后才进生产**，门控模式与贴纸一致。

- `Settings.musicEnabled`（可选字段，旧记录缺省按开），`SET_MUSIC` 事件、`setMusic` 用例、VM 字段齐备。
- `bgmTracks.ts` 为曲目登记表，**当前为空**。曲目要求：经小皮验收、循环无缝、可商用授权、≤2MB、放 `public/assets/f4/audio/`。
- `bgmPlayer.ts` 与 `tts.ts` 同构（可注入内核 + 浏览器默认实例）：循环播放、基础音量 0.32；TTS 开口时闪避至 0.08、结束恢复，并有 12s 安全计时器兜底平台不报 `onend` 的情况；iOS 禁止无手势自动播放时挂一次性 `pointerdown` 重试，不弹任何提示。
- 音乐只在农场页播放：`FarmHomeScreen` 卸载即暂停，进入学习/救援/写词自动静音，返回续播。
- **无已批准曲目时**：不创建 audio 元素、不显示"音乐"开关、播放器全程静默（已由测试与浏览器实测确认）。

补齐曲目只需在 `BGM_TRACKS` 登记一条 `assetStatus: 'approved'` 并放入音频文件，无需再改代码。

## 验证

- vitest：42 文件 / 226 测试通过（本次 +2 文件 +12 测试）。
- `tsc && vite build` 通过。
- 浏览器实测：间距与字体栈生效并量化对比；农场页无音乐开关、无 audio 元素、无控制台错误。

## 待办

- Codex 复核本次 CSS（视觉归属方），如需微调按视觉契约走。
- 曲目候选提交小皮验收。
- 正式贴纸交付后，在真机上验证拖拽手感与 40 只并存时的性能。
