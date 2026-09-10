# Claude 审查材料 · 小皮 iPad A16 反馈 + 场景二商店/衣柜上线复审

> 日期：2026-09-10 · 基线：`147ba31`（main，工作树干净）· 只读审查，未改任何运行时代码
> 验证：`tsc --noEmit` 干净；`vitest` 49 文件 288/288 通过；本地 dev 服务器 1180×820 视口（iPad A16 横屏逻辑尺寸）实测；快进模拟脚本见 §5.2

> **2026-09-11 实施状态:** 表中 1、2、3、4、5(兜底)、8、9 及 §2.1、§3.1–§3.4 已随 [F4-CHG-034](../changes/F4-CHG-034-review-spelling-daily-rhythm-streak-shield.md) / [F4-CHG-035](../changes/F4-CHG-035-ipad-a16-fixes-and-asset-diet.md) 上线;未做:孵化倒计时标签上移(Codex)、中层装饰深度排序、按场景独立穿戴、分层角色母版。

## 0. 结论摘要

| # | 问题 | 判定 | 严重度 |
|---|---|---|---|
| 1 | 首次打开特别慢 | **已确诊**：预缓存从 35.5 MB 涨到 **58.2 MB / 68 文件**，商店上线一次加了 22 MB；所有素材都是 1254² PNG，显示尺寸只有 82–300pt | 高 |
| 2 | 场景二装饰物拖动 | **已复现硬锁**：风车拖到任务卡背后 0/25 采样点可点，和 F4-CHG-031 同类；另有堆叠、长按弹菜单等 4 处 | 高 |
| 3 | 手写测试没了 | **机制已复现，真机截图已证实**：20 天后复习积压永远 >12，新词每 3 天暂停 2 天；暂停日课程里没有描红、没有收尾默写，常常连默写复习也没有。爸爸 23:19 的截图正是暂停日（DAY 38「今天先复习老朋友 · 复习 6 个」） | 高 |
| 4 | 连胜/连续天数 | 代码按 SPEC §3.3 应「永不清零」，实际漏一天就归 1；换机快进后极易出现「连续 1 天」配「DAY 40」 | 中 |
| 5 | 主页最底下一条线 | **真机截图定案**：屏幕最底部有一条约 30pt 高的纯天蓝色横带，颜色就是 `body` 背景 `#bfe5f7`——桌面 PWA 的固定视口没有铺到屏幕底边，露出了页面画布底色。见 §1.5 | 高 |
| 6 | 异色小鸡 | 代码与素材检查无异常（画布、可见轮廓、稀有度映射、保底都对）；全局只有 1 款异色是已知遗留 | 低 |
| 7 | 门禁过重 | `check:visual-references` 绑在 `npm run build` 和 CI 上，今天已经让上线部署失败一次（run 34486070065）；WIP 分支政策与「直接推 main」裁决冲突 | 中 |
| 8 | 退到主屏幕音乐还在响 | **已定位**：BGM 播放器只在离开农场页/关开关时暂停，没有监听 `visibilitychange`；iOS 把还在播放的 `<audio>` 当后台媒体继续放 | 高 |
| 9 | 家长页不能上下滑 | **已定位**：`body { overflow: hidden }` 而家长页容器是 `min-height: 100vh` 的普通流元素，内容超出后没有任何可滚动容器 | 高 |

## 1. 小皮报告的四个问题

### 1.1 首次打开慢（已确诊）

`dist/sw.js` 预缓存清单实测：

| 分组 | 大小 |
|---|---:|
| 场景二其它（背景 4.9 + 八张鸡窝 8 + 角色/驿站/路牌） | 17.3 MB |
| 场景二衣柜组合图 16 张（**本次新增**） | 11.5 MB |
| 场景二装饰 9 张（**本次新增**） | 9.4 MB |
| 场景一共享 PNG | 11.5 MB |
| 场景一八张鸡窝 | 7.2 MB |
| JS/CSS/音频/图标 | 1.3 MB |
| **合计 68 文件** | **58.2 MB** |

- 新设备/清缓存 = 全量重拉 58 MB。家里直连 github.io 实测 1.6 KB/s（见 2026-08-20 记录），理论要 10 小时；就算走代理 1 MB/s 也要 1 分钟才算「装完」。
- 首屏本身也重：场景二首屏要先拉背景 4.9 MB + 角色 2 MB + 驿站 2 MB + 路牌 1.2 MB + 鸡窝 1 MB ≈ 11 MB 才「长得对」，而 `registerSW({ immediate: true })`（`src/main.tsx:7`）同时在后台抢带宽拉另外 47 MB。
- `src/styles/f4/stage.css:22` 把场景一背景写死成 `.f4-bleed` 的 CSS 默认值：VM 还没加载时先请求 2.2 MB 的场景一背景，VM 到了再换成场景二的 4.9 MB。身在场景二的小皮每次冷启动都多下 2.2 MB，还会先闪一下晴空农场。
- 素材规格与显示尺寸严重不匹配：小装饰 1254×1254 显示在 104×82pt（2× 屏也只需 208px），线性过采样 6 倍、像素量 36 倍；每张解码后占 6.3 MB 内存。装饰商店一打开要解码 9+6+2 = 17 张 ≈ 107 MB，iPad Safari 的单页内存上限就在这个量级——这也是「有些贴图看不到」这类真机症状的头号嫌疑。

**修法（按收益排序）**
1. 素材管线：装饰/衣柜/鸡窝按显示尺寸的 2× 输出（小装饰 ≤ 256px、角色 ≤ 560px、地标 ≤ 660px），格式 WebP（8 月已试过整包 35 MB → 2.6 MB，q82 目检无差别）。这一项能把 58 MB 压到 5 MB 以内，其它优化都只是补丁。
2. 预缓存分层：`vite.config.ts:18` 的 `globPatterns` 只保留当前场景核心（背景、角色、鸡窝、共享小鸡）；`scenes/*/decorations`、`scenes/*/cosmetics`、非当前场景背景改走 Workbox `runtimeCaching`（CacheFirst），第一次真用到再缓存。
3. 商店卡片改用独立缩略图（≤ 256px），不要把 1 MB 的原图当预览。
4. `.f4-bleed` 的 CSS 默认背景改为只保留底色，背景图统一由 `FarmStageShell` 内联样式给出。
5. 治本之后再看 `immediate: true` 是否需要改成空闲时注册。

### 1.2 场景二装饰物拖动（已复现）

**A. 拖到任务卡背后永久点不到（硬锁，高）**

实测：买「苹果园风车」→ 摆出来 → 拖向左上角松手。落点被钳到地标边界最小值 `(240, 390)` 并写入 IndexedDB，风车整张画到完成卡片（z-index 65）背后，25 个采样点全部命中卡片，风车再也点不到；只有打开商店点「收起来」才能救回，小皮不会知道。

根因：`src/domain/farmScenes.ts:140` 的 `PLACEMENT_BOUNDS_BY_KIND` 只钳「地面锚点」，地标锚点在 (240,390) 时画布左上角是 (73,116)，整个落在任务卡/完成卡/回访卡的矩形（约 28–418 × 88–436）里；中型物件在 (120,500) 时上半截也被完成卡（底边 429）盖住。`src/domain/farmLayout.ts:30` 的 `DAILY_BOARD_KEEPOUT` 和 `resolveSceneElementHome`（`:87`）只保护母鸡/小皮/鸡窝/救援框四类，装饰物没有接。

同类盲区：右下角「布置农场／打开衣柜」按钮组（`home.css:1105`，z 64）和左下角路牌按钮（z 66）都高于装饰层（back 8 / actor 19 / front 30），小装饰滑到右下角也会被按钮盖住。

修法：在领域层给装饰加 keep-out（按 kind 的 displayBox 计算矩形，避开任务卡与右下按钮组），松手、`placeDecoration` 与 `snapshot` 归一化三处共用，老存档下次加载自动救回——完全复用 F4-CHG-031 的结构。拖动过程可把 `.farm-decoration-f7.is-dragging` 的 z-index 提到 90 让手感跟手，落点仍走钳制。

**B. 「摆出来」全部落在同一个点（中）**

`FarmCustomization.tsx:194` 把每件新摆出的物件放在该 kind 的边界正中心：4 件小装饰会叠在 (597,685) 同一点上，只有最上面一件能拖，下面的完全点不到，孩子体感就是「拖不动」。修法：按已摆放物件避让（同 kind 依次向右/向左错开一个 displayBox），或者摆出来时直接进入拖动态。

**C. iPad 长按弹出图片菜单（中，iPad 特有）**

全部样式里没有一处 `-webkit-touch-callout: none`。`.farm-decoration-f7 img`、`.sprite-f3`、`.hatchery-state-f4`、`.rescue-entry-f4 img` 都是 `<img>`，iPad 上按住不动超过约半秒会弹出图片预览/分享菜单，把拖动打断。桌面浏览器复现不了，真机必现。一行 CSS 修好。

**D. 中层装饰永远压在角色后面（中，观感）**

`home.css:1083` 的 actor 层 z 19 低于角色 z 20，长椅放到母鸡脚前仍画在母鸡身后；`--f7-depth-key` 写了但没有任何 CSS 用它。要么按 y 深度排序，要么接受并在文档写明。

**E. 每次松手整件重建（低）**

`FarmDecorations` 的 key 含坐标，每次落点变化都卸载重挂 `<img>`，iPad 上等于重新解码 1 MB PNG，会闪一下。key 用 itemId 即可。

### 1.3 手写测试没了（机制已复现）

用真实的 `fastForward` + `clockGuard` + `buildLessonPlan` 模拟「快进 N 天后继续每天全对学习」（脚本见 §5.2），第 20/40/80 天的结果一致：

```
快进 40 天后
09-10 due=16 review=6 new=4 paused=false  steps={dictation:2, choice:8, intro:4, trace:4, closing:4}
09-11 due=22 review=6 new=4 paused=false  steps={choice:7, dictation:3, intro:4, trace:4, closing:4}
09-12 due=36 review=6 new=0 paused=true   steps={choice:1, dictation:3, listening:2}
09-13 due=40 review=6 new=0 paused=true   steps={listening:6}          ← 整课没有任何书写
09-14 due=48 review=6 new=4 paused=false  steps={dictation:3, choice:7, intro:4, trace:4, closing:4}
09-15 due=54 review=6 new=0 paused=true   steps={dictation:2, listening:4}
09-16 due=56 review=6 new=0 paused=true   steps={dictation:3, choice:3}
09-17 due=50 review=6 new=4 paused=false  ...
```

- `REVIEW_CAP = 6`（`dailyPlan.ts:5`）而 FSRS 的日到期量在第 20 天后就稳定在 16–60，积压永远 >12。SPEC §5.1 的「连续 3 天到期 >12 → 暂停新词 1–2 天」本来是为临时高峰设计的，现在变成常态：**暂停 2 天 → 恢复 1 天 → 再暂停 2 天**，无限循环。
- 暂停日 `newIds = []`，课程里没有描红（trace）也没有收尾默写（closing）；复习默写又受 `DICTATION_DAILY_CAP = 3` 和 stability ≥ 7 双重限制，运气差的日子（如 09-13）整课就是 6 道听音选择——「手写没了」。
- 首页写词游戏木牌本身没丢，但只在「完成态 + 当前旅程」出现；回访旧场景时被回访卡替代，也可能被误认为「没了」。

**修法（建议 2+3 一起做）**
1. 暂停判定改成看「积压是否在增长」而不是绝对值，或把阈值与 cap 解耦；否则 cap 6 之下这个规则永远触发。
2. 暂停日保底 1 个新词（SPEC §0「永不惩罚」和 `PAUSE_MAX_DAYS` 注释「不无限饿着新朋友」的本意），保证每天至少有描红 + 收尾默写。
3. 「手写贯穿」（SPEC §5.2）落到规则里：每课至少 1 步书写，复习默写不足时用当天复习词补一道不计分的收尾默写。
4. 复习债上限 6 的产品决定要不要动，是爸爸的裁决，不在本清单内；但要知道当前 6+4 的配置在数学上一定进入这个循环。

### 1.4 连胜/连续天数

- `src/domain/streak.ts:12`：`lastDoneDate` 不是昨天就把 streak 归 **1**。SPEC §3.3（第 151 行）写的是「清零在产品上不存在——最低会回落到本月最长纪录，每月自动发 3 张补签卡」，代码注释也承认补签卡是 v0.3 待办。换机、生病、周末漏一天，首页就从「连续 38 天」变成「连续 1 天」，孩子看来就是坏了。
- 换机快进加剧了这点：`fastForward` 把 `lastDoneDate` 设为快进当天的**昨天**，如果快进那天小皮没学、第二天才学，streak 直接归 1，而任务板 DAY 编号照旧走到 N+1——「连续 1 天」和「DAY 40」并排出现。
- 用词不统一：首页完成卡叫「连续 N 天」，结束页叫「连续学习 N 天」，家长页叫「连胜 N 天 · 累计 M 天」，三处指的是同一个 `meta.streak`，而「累计」才是 totalDays。小皮说的「连胜天数和连续天数」很可能就是 streak 与 totalDays 对不上。

**修法**：先落地 §3.3 的宽限（至少：漏 1 天不清零；完整版：每月 3 张补签卡 + 回落到本月最长纪录）；三处文案统一为「连续 N 天 · 累计 M 天」并在完成卡同时显示两个数。

### 1.5 主页最底下一条线（真机截图已定案：视口没铺到底）

爸爸 23:19 的桌面 PWA 截图（iPad A16 横屏，standalone）：

- 顶部正常：状态栏时间/电量直接画在天空背景上，`black-translucent` 生效。
- **底部约 30pt 高一条纯色横带**，横贯整个屏幕宽度，颜色是 `#bfe5f7`——这正是 `src/styles.css:22` 的 `body { background: #bfe5f7 }`，也是 `--f4-sky`。Home 指示条就落在这条带子里。
- 鸡窝的「等待鸡蛋」标签和进度线紧贴在带子上方，看起来像是「一条线挡在最底下」。

推断：`.f4-viewport` 是 `position: fixed; inset: 0`，`.f4-bleed` 铺满它。带子颜色是页面画布底色而不是任何一层的内容，说明 **固定定位的布局视口比屏幕矮了约 30pt**，最底下那段没有任何元素，只剩画布颜色。7-22 加的全屏视觉层守卫管的是「舞台内不许铺满着色」，管不到「视口本身不够高」这种设备层问题。

候选原因（需要真机数字确认，桌面浏览器复现不了）：
1. iPadOS 26 的主屏幕 Web App 在横屏下把 Home 指示条区域排除在布局视口之外（新 iPad 出厂即 iPadOS 26；旧 iPad Pro 在 iPadOS 17/18 上没出现过）。
2. `viewport` meta 缺 `height=device-height`，iOS 某些版本在 standalone 下按旧规则算高度。

**建议做法**
1. 先在家长页加一块「设备诊断」只读面板：`innerWidth×innerHeight`、`screen.width×height`、`visualViewport.height`、`documentElement.clientHeight`、四个 `env(safe-area-inset-*)`（用探针元素的 padding 读）、`navigator.standalone`、UA。爸爸在 iPad 上打开一次读数就能定案，以后所有真机视口问题都靠它，不用再来回猜。
2. 无论根因是哪种，都做一层兜底：把 `html` 的画布背景从纯天蓝改成随场景走的底色（草地绿，用 CSS 变量由 `FarmStageShell` 按场景写入），带子即使还在也不再是一条刺眼的蓝线；根因确认后再决定是否用 `height=device-height` 或负 `env()` 外扩视口。
3. 孵化「上字下线」标签本身贴着舞台底边 3px（`home.css:740`），这次真机上它正好压在蓝带上沿，观感更差；标签上移的建议保留给 Codex。
4. `InstallHint` 提示条这次排除（截图是 standalone，没有出现）。

### 1.7 退到主屏幕后音乐还在响（已定位）

`src/features/farm-f4/audio/bgmPlayer.ts` 的默认实例只在两种情况暂停：`FarmHomeScreen` 卸载（进学习/救援/写词/家长页）和音乐开关关闭。按 Home 键退到桌面时 `FarmHomeScreen` 没卸载，`<audio loop>` 继续播；iOS 把正在播放的音频元素当成后台媒体保留，于是主屏幕上还在响，只有把 App 从多任务里划掉才停。

修法：在默认实例里监听 `document.visibilitychange`（`hidden` → `audio.pause()`；`visible` 且 `active` → `tryPlay()`）和 `pagehide`。`useFarmHome` 已经用同一事件做时钟守卫，行为一致。可注入内核加一个 `onVisibility` 依赖即可单测。

### 1.8 家长页不能上下滑（已定位）

`src/styles.css:19` 的 `body { overflow: hidden }` 是给固定舞台用的；家长页 `.parent-screen` 却是普通流元素，`min-height: 100vh; overflow-y: auto`（`parent.css:5-11`）——`min-height` 只会让它跟着内容长高，自己永远不会滚，长出来的部分又被 `body` 的 `overflow: hidden` 吞掉。桌面高窗口内容放得下所以 8-5 验收时没发现，iPad 横屏 820pt 一定溢出。

修法：`.parent-screen`/`.parent-gate` 改成 `height: 100%`（`#root` 已是 100%）或 `position: fixed; inset: 0`，保留 `overflow-y: auto`，再加 `padding-bottom: calc(48px + env(safe-area-inset-bottom))`。两行 CSS。

### 1.6 异色小鸡

检查项：`chick-f3.png` 与 `chick-color-approved-b.png` 都是 1254² 画布、可见轮廓 564×768 同位同大，都按 116pt 渲染，不会一大一小；`chickAssetId` 按 rarity 取图正确；`rollHatchRarity` 83/13/4 + 保底 9/23 与 F4-CHG-030 一致；破壳序列 `twoShells → colorHatch → 入场` 正常。没有发现 bug。已知遗留：全局只有 1 款异色、1 款特殊，`variantId` 不参与显示，所有异色小鸡长得一模一样——如果小皮说的是「异色小鸡都一样/不像特别的」，那是款式池问题不是 bug，需要另立 F4-CHG 扩款式。

## 2. 场景二商店/衣柜其它发现

| # | 发现 | 位置 | 严重度 |
|---|---|---|---|
| 2.1 | 回访场景一时仍显示「打开衣柜」并列出 6 件场景二装扮，穿上后角色毫无变化（场景一走 `xiaopi-f3.png` 回退）。F7 文档要求穿戴按场景独立保存（`kv.sceneLoadouts`），实现仍是单一全局 `kv.loadout`——文档与实现脱节 | `viewmodel.ts:341`、`characterAppearance.ts` | 中 |
| 2.2 | 组合矩阵方案：6 件商品要 16 张整身图。每加 1 款发型/帽子 ×4、每加 1 款服装 ×1.5，场景三如果再来 6 件就是 30+ 张 1 MB 图。F7 原定的分层（body/outfit/headLook/accessory）才是可持续路线，现在只是权宜 | `docs/00-start/CURRENT_TASK.md` 目标段已自述 | 架构债 |
| 2.3 | 装饰商店/衣柜面板一次渲染 17 张原图（见 1.1） | `FarmCustomization.tsx` | 中 |
| 2.4 | 购买/装备/卸下/刷新恢复/扣蛋在本地实测全部正确（80 蛋衣柜 + 90 蛋装饰，扣款准确，刷新后组合图正确） | — | 通过 |
| 2.5 | 蛋经济：全部商品 170 蛋，日收入 2 + 最多 10；按小皮实际每天 4–6 蛋约 1 个月买完一个场景，节奏合理 | — | 通过 |

## 3. 门禁与流程复审

| # | 发现 | 建议 |
|---|---|---|
| 3.1 | `package.json:9` 的 `check` 把 `check-visual-references.mjs` 绑进 `npm run build`，`deploy.yml:31` 又跑一遍。它校验的是 `CURRENT_TASK.md` 里的 YAML 引用路径——一个**任务文档**的字段能让**生产部署失败**。今天就发生了：run 34486070065 因引用仓库外文件失败，补了 `6047559` 才上线 | 把它从 `build`/CI 拿掉；只作为美术任务开始前手动跑的 `npm run check:visual-references`，或仅在 `CURRENT_TASK.md` 被改动的提交上跑。`check:fullbleed` 抓过两次真回归，保留 |
| 3.2 | `EXECUTION_BUDGET_POLICY.md:33`「检查点只允许在 `codex/wip-*` 分支、不 push」与爸爸 2026-07-25「直接在 main 提交推送」的裁决相反 | 改文档，与实际流程一致 |
| 3.3 | 每个任务都要重写 `CURRENT_TASK.md` 的 YAML 门禁、跑 `merge-base` 校验、写 allowed_paths；最近 10 个提交里有 3 个是纯「docs(task): record push approval」。对美术/资产任务这是必要的护栏，对 bug 修复是纯开销 | 增设「hotfix 通道」：bug 修复只要 L1（test + typecheck + fullbleed + diff）+ progress.md 一行记录，不重写 CURRENT_TASK，不需要 push 审批提交 |
| 3.4 | CI：`npm run check` → `npm test` → `npm run build`（内部再跑一次 check + tsc） | 去掉 CI 里独立的 check 步骤，让 build 一次跑完；约省 20 秒，无风险 |
| 3.5 | QA 脚本（`scripts/qa-scene2-*.mjs`）只在人工跑时执行；这次的 keep-out 硬锁正是自动测试没覆盖的交互边界 | 把 1.2A 的落点钳制写成 domain 单测（与 `farmLayout.test.ts` 同款），比截图脚本可靠 |
| 3.6 | 视觉系统 §9.4 八步串行门禁对每个新场景仍然值得保留；但它没有拦住「素材规格远大于显示尺寸」这一条——门禁验的是身份和画风，没有验产出规格 | 在 §9.4「非破坏性技术整理」一步加入「按显示尺寸 2× 输出 + WebP」的硬规格 |

## 4. 建议执行顺序

**P0（先修，对小皮可见）**
1. 三个小修：BGM 后台暂停（1.7）、家长页可滚动（1.8）、`-webkit-touch-callout: none`（1.2C）——各几行，风险最低，先上。
2. 家长页设备诊断面板 + 画布底色随场景（1.5）——先拿到真机数字，再定视口根治方案。
3. 装饰 keep-out + 堆叠避让（1.2 A/B）——领域层，可加单测。
4. 素材瘦身管线 + 预缓存分层 + 商店缩略图（1.1）——这是首屏慢和贴图丢失的根。
5. 把 `check:visual-references` 移出 build/CI（3.1）——防止下次上线再被文档卡住。

**P1**
6. 手写保底 + 暂停规则修正（1.3）——需要爸爸确认「暂停日保底 1 个新词」这条产品规则。
7. 连胜宽限 + 三处文案统一（1.4）——需要爸爸确认宽限方式。
8. 孵化倒计时标签上移（1.5 第 3 条，Codex 视觉）。

**P2**
7. 按场景独立穿戴、深度排序、文档对齐（2.1、1.2D、3.2、3.3）。
8. 分层角色母版替代组合矩阵（2.2）。

## 5. 验证记录

### 5.1 本次跑过的命令

```bash
npx tsc --noEmit          # 干净
npx vitest run            # 49 文件 288/288 通过（2.8s）
gh run list --limit 6     # 最近一次部署 34487277635 成功；34486070065 失败（视觉引用门禁）
```

浏览器（dev server，1180×820）：
- 播种场景二完成态 → 首页正常，控制台 0 错误。
- 买 4 件装饰摆出来：花篮和木箱落在同一点；风车拖到左上角后持久化 (240,390)，`elementFromPoint` 25 点全部命中完成卡片，风车不可见不可点。
- 衣柜买 3 件、装备：首页与预览均切到 `xiaopi-bonnet-overalls-none.png` / `mother-bonnet-none.png`，扣蛋 45 正确。
- 回访场景一：入口只剩「打开衣柜」，列出 6 件场景二装扮，角色为场景一回退图。
- `?install-hint` 强制显示：底部中央出现安装提示条。
- 孵化状态标签：底边距视口底 3px，压鸡窝图 17px。

### 5.2 快进模拟脚本

仓库外：`%LOCALAPPDATA%\Temp\claude\D--Projects-pipienglish\14ab6aae-c87c-4ff3-909b-d2b5bc790b3f\scratchpad\backlog-sim.test.ts`，用真实 `fastForward`/`clockGuard`/`createLessonUsecases` 模拟 20/40/80 天后连续 14 天全对学习，输出每日 due/review/new/paused 与课程步骤统计。若要留档可搬进 `src/application/` 作为回归测试。

## 6. 需要爸爸/小皮补充

1. ~~「最底下一条线」的真机截图~~ 已收到（23:19，standalone，底部蓝带）；下一步是家长页诊断面板的读数。
2. ~~「手写测试没了」指什么~~ 截图证实当天是新词暂停日，课程里没有描红/默写；写词游戏木牌只在完成态出现。
3. 连胜问题时看到的具体两个数字（首页「连续 N 天」和任务板「DAY M」）。
4. 异色小鸡具体哪里不对（大小、颜色、出现频率、都长一样）。
5. 新 iPad 的系统版本（设置 → 通用 → 关于本机），用来确认 1.5 的 iPadOS 26 假设。

## 7. 本轮未做的事

未改代码、未提交、未推送、未部署；未清理任何 worktree。新增本文件一处，未纳入 `CURRENT_TASK.md` 的 allowed_paths（本轮是审查不是任务执行）。
