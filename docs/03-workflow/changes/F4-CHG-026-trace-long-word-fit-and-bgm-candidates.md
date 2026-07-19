---
change_id: F4-CHG-026
date: 2026-07-19
stage: post-launch-fixes
affected_state:
  - lesson_trace_layout
  - audio
production_behavior_change: shipped
approval: dad-requested
implemented_by: claude
visual_owner_review: pending-codex
child_approval: bgm-pending-xiaopi
---

# 描红长单词溢出修复与 BGM 候选

## 1. 描红底字长单词被裁（生产行为变更）

**现象：** 爸爸 iPad 实拍，`pineapple` 的底字左右各被裁掉一个字母，显示成 `oineapple`。

**根因：** `.lesson-trace-model-f4` 字号写死 172px，描红框 `overflow: hidden`。词库最长词为 11 字母（`supermarket`、`living room`），在 172px 下实测排版宽度 1135px，而四线格可用宽度仅约 744px，超出部分被裁。`pineapple` 实测 887px，同样超出。

**修复：** 底字仍按 172px 排版，新增纯函数 `fittedTraceModelScale(实测宽度)` 计算等比缩放系数，经 CSS 变量 `--f4-trace-model-scale` 复合到既有 `translate(-50%,-50%)` 上。

- 只用 transform，不改字号，避免重排；宽度实测一次即可。
- 安全宽度定为 720px（四线格实测 744px，左右各留 12px 呼吸）。
- 圆体字在 iPad 上可能迟到加载，`document.fonts.ready` 后补测一次。
- `white-space: nowrap` 防止窄字体下意外折行。

**实测结果（1194×834）：**

| 单词 | 排版宽度 | 缩放 | 结果 |
|---|---:|---:|---|
| egg | 328px | 1.000 | 不变 |
| pineapple | 887px | 0.812 | 完整落在四线格内，边距 11px |
| supermarket | 1135px | 0.634 | 完整落在四线格内，边距 12px |

短词完全不受影响。长词字形变小但仍居中于四线格之间，描红体验不变（本页本就不评分、不要求写得一模一样）。

**附带：** DEV 预览参数 `?lesson-trace=` 与 `?lesson-intro=` 改为共用同一组预览词，并新增 `supermarket`（词库最长词）作为排版边界样本，方便后续校验。仅 `import.meta.env.DEV` 可见。

## 2. BGM 候选（待小皮验收）

小皮要求"舒缓解压轻快的背景音乐"。因不得使用来源不明的音频，候选曲目由 `scripts/make-bgm.mjs` **从零合成原创波形**（无采样、无第三方素材、无版权风险）。

三首候选：

| 曲目 | 时长 | 大小 | 风格 |
|---|---:|---:|---|
| 晴空农场 sunny-farm | 27.1s | 371 KB | C 大调五声，音乐盒主旋律 + 长音垫，最日常耐听 |
| 云朵散步 cloud-walk | 33.9s | 464 KB | F 大调，最安静，几乎只有垫音与零星铃音 |
| 小鸡散步 chick-stroll | 22.4s | 308 KB | G 大调，木琴有一步步走的跳跃感，最有精神 |

合成器的儿童向约束：五声音阶为主（无半音摩擦）、无打击乐、无强低频冲击、无突然音量跳变、整体柔和低通。

**质量实测：** 峰值 −3.3 ~ −4.1 dBFS 无削波；直流偏置 ≈0；RMS ≈ −16 dB（背景音量合适）；循环接缝跳变 0.001~0.003，均**小于曲内正常逐样本跳变**，即无咔哒爆音。

**音频文件暂不入库。** 未批准素材若进 `public/`，会被 PWA 预缓存进离线包白白占体积。小皮选定后，只需把该曲 MP3 放入 `public/assets/f4/audio/` 并在 `bgmTracks.ts` 登记一条 `assetStatus: 'approved'` 即生效，代码无需改动。合成脚本已入库，任何一首都可随时重新生成。

## 验证

- vitest：42 文件 / 228 测试通过（本次 +2 测试）。
- `tsc && vite build` 通过。
- 浏览器实测三种词长的缩放与边距（见上表）。

## 待办

- 小皮选定 BGM（可多选，登记表支持多条，`approvedBgmTrack` 取第一首已批准的）。
- Codex 复核本次 CSS 与描红底字的视觉观感。
- 真机验证长词底字在 iPad 上的清晰度。
