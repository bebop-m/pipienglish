---
change_id: F4-CHG-027
date: 2026-07-19
stage: post-launch-fixes
affected_state:
  - audio
  - chick_collection
  - rescue_feedback
production_behavior_change: shipped
approval: dad-requested
implemented_by: claude
visual_owner_review: pending-codex
---

# BGM 投产与「小鸡被抓」农场反馈

## 1. 背景音乐投产

爸爸 2026-07-19 提供并选定 `pipi_farm_bgm_02_english_garden`，取代 Claude 合成的候选。

- 落库为 `public/assets/f4/audio/bgm-english-garden.mp3`，登记 `assetStatus: 'approved'`，SHA-256 已入 `asset-manifest.json`。
- 入库前实测：30.0s；循环接缝跳变 **0.00006**（曲内最大跳变 0.673，故无咔哒）；峰值 −0.72 dBFS 无削波；RMS −15.46 dB；192 kbps 立体声 705 KB（≤2MB 限内）；带 Xing/Info gapless 头。
- 结尾 0.5s 为 −21.5 dB 的乐句休止，曲中 27.0s / 2.0s 有同量级起伏，**不是**渐弱后突变，循环听感自然。

**同时修复一处离线缺陷：** `vite.config.ts` 的 `globPatterns` 未包含 `mp3`，音频不会进 PWA 预缓存，断网时音乐静默。已补 `mp3`，预缓存由 21 项 / 10904 KiB 增至 22 项 / 11610 KiB。

## 2. 「小鸡被抓」在农场上没有反馈（生产行为变更）

**现象：** 爸爸反馈救援队列有词时，农场小鸡一只没少。

**根因：** `rescue` 是按 `wordId` 存的独立表，与 `chicks` 表无任何关联；`collectSceneChicks` 也不知道救援队列存在。结果只有救援篮角标 `×N` 变化，草地不变。SPEC §2.5 软化条款③写明「农场小鸡总数永不减少，**被抓的只是换了个展示位**」——「换展示位」从未实现。

**修复（两层）：**

1. 领域层 `collectSceneChicks(chicks, sceneId, capturedCount)` 新增第三个分区 `captured`：
   - 被抓的从**草地上正在显示的非收藏小鸡**里取，最早孵化的先被抓；
   - **皮皮收藏的小鸡永远不会被抓走**（避免「答错就失去心爱的鸡」这种惩罚感）；
   - 鸡舍不补位，`chicksTotal` 不变，`visible + captured + inCoop` 恒等于场景总数；
   - 救援队列长于可抓小鸡数时只抓走实际有的，不出现负数。
2. 视觉层草地站位由固定 6 个改为 `6 − 被抓数`（下限 0）。**这一步是必需的**：草地只有 6 个站位，鸡多于 6 只时若从 `chicksVisible` 补位，「少了小鸡」完全看不出来。

救援篮只属于当前旅程场景；回访旧场景不会少鸡。

**实测（8 只小鸡）：**

| 救援队列 | 草地上小鸡 | 救援篮 | 小鸡总数 |
|---:|---:|---|---:|
| 0 | 6 | ×0 | 8 |
| 4 | 2 | ×4 | 8 |
| 2（救回两只后） | 4 | ×2 | 8 |

鸡舍面板同步：8 条全在，4 条标「正在农场散步」、4 条标「在篮子里等你来接」，标题仍为「这里一只也不会丢」。

## 3. 需要爸爸裁决的一点（本次未改）

爸爸描述为「小皮**做错**了 4 题」。但 SPEC §2.5 现行规则是：

> 与重试规则的分工：**答错 → 当前卡原地重试；点「想不起来」 → 跳过进救援**

代码与该规则一致：`RESCUE` 效果只由 `FORGOT` 事件产生，答错（`ANSWER{correct:false}`）不入救援队列。因此：

- 若小皮当时点的是「想不起来」→ 本次修复即可解决，草地会正确少鸡；
- 若她是**答错**了 4 题 → 按现行裁决本就不该抓走小鸡，救援篮应为 ×0。若希望答错也抓，属于产品规则变更（推翻 2026-07-17 的裁决），需要爸爸明确，Claude 未擅自改动。

## 验证

- vitest：42 文件 / 232 测试通过（本次 +4 测试，覆盖被抓分区、收藏豁免、队列超长、>40 只边界）。
- `tsc && vite build` 通过；预缓存含音频。
- 浏览器端到端实测上表三种状态，含救回后小鸡返回草地；MP3 以 206 分段流式加载正常。

## 待办

- Codex 复核草地站位规则与鸡舍文案。
- 真机确认音乐音量（播放器基础音量 0.32，TTS 时闪避至 0.08）是否合适。
