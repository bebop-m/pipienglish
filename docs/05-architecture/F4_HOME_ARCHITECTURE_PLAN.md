# F4 首页正式接入 · 内部架构与实施方案 v1

> 作者:Claude(架构)。依据 `docs/03-workflow/CLAUDE_CODEX_VISUAL_CONTRACT.md` §4 交付格式。
> 本文**不含任何视觉主张**:不改 Token、不改布局、不替换素材。所有界面坐标均为
> **1194×834 逻辑坐标(stage pt)**。可能改变 F4 视觉的架构决策集中在 §11,一律待确认、不自行决定。

## 0. 任务四问(AI_START_HERE 要求)

1. **修改哪一层**:仅架构层(本文档 + 后续 `src/` 内部重构);不触碰背景、场景物件、角色、UI 视觉。
2. **直接参考且不可修改**:`F4_BASELINE_MANIFEST.md` 登记的全部 16 个文件(F4 页面三件套 + 继承 CSS ×2 + 图片 ×9 + 参考母图 ×2)。
3. **逻辑尺寸**:1194×834;本文不产出画布/资产。
4. **未破坏 F4 的证明**:2026-07-16 运行清单 §4 校验命令,16 个 SHA-256 全部一致;本轮对 `design-samples/` 零写入。

## 1. 模块边界

目标结构(契约 §7),以及现有 v0.1 文件的去向:

```text
src/
  domain/                    # 纯规则,零依赖(不 import Dexie/React/图片路径/CSS 类名)
    words/                   #   词库数据 + Word 类型(词库保持打包进代码,见 §6.1)
    srs.ts                   #   FSRS 包装(现 src/srs.ts 迁入)
    dailyPlan.ts             #   今日队列构建规则(复习≤25/新词4/热身/乱序,自 session.ts 拆出)
    eggEconomy.ts            #   蛋的获得/分配/孵化/煎蛋规则(新增,规则见 §2.2)
    staleness.ts             #   陈旧度加权抽词(SPEC §2.4)
    streak.ts                #   连胜与日期翻转规则
  application/               # 用例编排 + 持久化协调(可 import domain 与 db)
    db.ts                    #   Dexie v2(现 src/db.ts 迁入并升级,见 §6)
    usecases/                #   loadFarmHome / completeDailyLesson / allocateEgg /
                             #   cookEgg / feedChick / chickChat / placeChick / rollover
    services/tts.ts          #   发音服务(现 src/tts.ts 迁入,接口化)
    farmHomeMachine.ts       #   首页状态机(§3)与 ViewModel 组装(§4)
  features/farm-f4/          # F4 首页(视觉实现归 Codex)
    FarmHomeScreen.tsx       #   容器:useFarmHome() → 传 VM/dispatch 给视觉组件
    useFarmHome.ts           #   VM 订阅 + 事件分发(Claude 提供)
    stage/useStageScale.ts   #   固定舞台缩放(FIDELITY §3 公式,Claude 提供逻辑)
    stage/stagePoint.ts      #   client→1194×834 坐标换算纯函数(Claude 提供)
    visual/                  #   Codex 全权:bleed/stage CSS、actors、散步/互动/拖拽、面板
  components/learning/       # 学习流卡片(本轮不动,后续屏按契约 §9 逐屏接入)
  styles/f4/                 # F4 Token 与舞台样式(Codex 从锁定 CSS 派生)
public/assets/f4/            # 母版资产的生产副本(复制,不移动母版;登记副本哈希)
visual-regression/           # 黄金截图与差异报告(Codex)
```

边界铁律:`domain/` 不得出现图片路径、CSS 类名、DOM;`features/*/visual/` 不得直接写 Dexie 或 FSRS。旧的 `src/components/Chick.tsx / Farmer.tsx / Farm.tsx`(SVG 占位画风)按契约 §5 不得进入面向小皮的构建——阶段 C 起从首页移除,过渡期只允许存在于尚未轮到的旧屏(§11 V-8)。

## 2. 领域模型

### 2.1 类型(TypeScript)

```ts
// —— 学习域(沿用 v0.1,类型收敛) ——
interface Word {
  id: string; word: string; meaning: string
  sentence: string; sentenceCn: string
  pack: string; level: 1 | 2 | 3
  imageAssetId?: string          // F4 本地单词插图(P1 资产),不用 emoji 交付给孩子
}
interface CardRecord { wordId: string; due: number; card: FsrsCard }   // FSRS 状态
interface DailySession {
  date: string                   // YYYY-MM-DD(本地日,即 dayKey)
  reviewIds: string[]; newIds: string[]
  doneCount: number; answered: number; correct: number
  completed: boolean
}

// —— 农场域(F4 引入的蛋经济,正式化) ——
interface FarmState {
  henName: string | null
  eggStock: number                                   // 未分配的蛋,无上限(永不惩罚:不没收)
  incubating: { slot: 0 | 1 | 2; placedAt: number }[] // ≤3;placedAt 为毫秒时间戳(24h 规则)
  cooking: 'empty' | 'raw' | 'cooking' | 'ready'      // 锅的持久状态(F4:关面板保留进度)
}
interface Chick {
  chickId: string                // nanoid
  bornOn: string                 // 孵化日 dayKey
  source: 'hatch' | 'migration'  // migration = v0.1 旧数据迁入
  homeX: number | null           // 手动拖放后的散步中心,1194×834 逻辑坐标
  homeY: number | null           // null = 未手动放置,由视觉层分区算法安排
}

// —— 记忆通道共享 ——
interface SeenRecord { wordId: string; lastSeenAt: number }   // 陈旧度抽词(SPEC §2.4)
interface RescueEntry { wordId: string; capturedAt: number }  // 救援队列(SPEC §2.5)

// —— 元信息 ——
interface MetaState { streak: number; lastDoneDate: string | null; totalDays: number }
interface Settings { motionEnabled: boolean }
```

### 2.2 蛋经济规则(F4 交互所体现的产品规则,正式化)

1. 完成当日必修 → `eggStock += eggsEarned`(SPEC §2.3:1~2 枚;当日任务项 ≥15 记 2,否则 1;同日幂等)。
2. 每颗蛋二选一(F4「鸡蛋要怎么用?」面板):**孵化**(需空巢位,3 槽)或 **煎蛋**。
3. 孵化完成时机(**2026-07 爸爸已裁决,V-1 关闭**):**固定 24 小时**,
   `hatchesAt = placedAt + 24h`,`now ≥ hatchesAt` 即破壳生成 `Chick`、释放巢位。
   到期结算不只在日期翻转:应用打开时、visibilitychange、60s 时钟守卫均检查
   (孵化可能在使用中到点)。**不显示倒计时条**;点击孵化中的蛋 → 显示剩余时间
   (弹出形式由 Codex 设计,属新增交互,走变更单)。
4. 煎蛋状态机:`empty →(放蛋,eggStock-1)→ raw →(开火)→ cooking →(1.9s)→ ready →(喂食)→ empty`。跨会话持久;崩溃恢复规则见 §7.3。
5. 喂食:`ready` 时喂一只小鸡(F4 现行随机;目标选择差异见 §11 V-6),纯情感互动,无数值。
6. 永不惩罚检查:蛋不过期、不没收;巢位满时只是不能再放;`eggStock` 无上限。

### 2.3 小鸡可见集合

`chicksTotal = chicks.count()`;可见集合 = **最近孵化的 ≤40 只**(展示"最近的成长"),
其余计入 `chicksInCoop`(顶栏/鸡舍 ×N)。该 40 上限来自 SPEC §2.1;可见/收纳的最终呈现依赖
P0 鸡舍资产与 Codex 方案(§11 V-5)。

## 3. 首页三状态状态机

```text
                 NAME_HEN
  first_visit ────────────────▶ daily_incomplete
                                   │  DAILY_LESSON_COMPLETED
                                   ▼  (发蛋、更新连胜、learnedToday)
                                daily_complete
                                   │  DAY_ROLLOVER(dayKey 变化)
                                   ▼  (结算孵化 → 新小鸡;重建今日队列)
                                daily_incomplete
```

- **状态判定(纯函数,可重放)**:`henName == null → first_visit`;否则
  `todaySession.completed ? daily_complete : daily_incomplete`。
- **DAY_ROLLOVER** 对任意状态幂等:结算到期孵化蛋 → 生成小鸡;重建 `DailySession`;
  重算 streak 展示值。触发时机见 §7.2。
- **正交子状态**(不属于三态,与其并存):
  - `overlay: none | egg_panel | hatchery_pop | rescue_pop`(互斥,与 F4 JS 现行为一致:开一个关另一个);
  - `egg_panel` 内部视图由 `cooking` 推导:`empty → 选择视图,其余 → 煎蛋视图`(F4 现行为);
  - `cooking` 持久化,overlay 不持久化(冷启动回 `none`)。
- **守卫**:`START_DAILY_LESSON` 仅 `daily_incomplete`;`ALLOCATE_EGG_TO_HATCH` 需
  `eggStock>0 && incubating.length<3`;`PUT_EGG_IN_PAN` 需 `eggStock>0 && cooking==='empty'`;
  `FEED_CHICK` 需 `cooking==='ready'`;`NAME_HEN` 仅 `first_visit`。

## 4. 视觉层消费的只读 ViewModel

```ts
/** 所有坐标均为 1194×834 逻辑坐标 */
interface StagePoint { x: number; y: number }

type FarmHomeState = 'first_visit' | 'daily_incomplete' | 'daily_complete'
type CookingState  = 'empty' | 'raw' | 'cooking' | 'ready'
type FarmOverlay   = 'none' | 'egg_panel' | 'hatchery_pop' | 'rescue_pop'

interface IncubatingEggVM { slot: 0 | 1 | 2; placedAt: number; hatchesAt: number }
// 剩余时间 = hatchesAt - now,由视觉层在"点蛋"时计算显示(V-1 裁决:无常驻倒计时)

interface FarmChickVM {
  chickId: string
  bornOn: string
  home: StagePoint | null   // 手动散步中心;null = 视觉层分区安排(F4 chickHomes 分区算法归视觉层)
  isNewToday: boolean       // 今晨刚孵出,视觉层可做一次性登场表现(表现形式待 Codex)
}

interface ChickChatVM {     // 群聊(§11 V-4,行为需视觉确认后启用)
  primary: { chickId: string; word: string; meaning: string }   // 播 TTS 的那只
  others:  Array<{ chickId: string; word: string; meaning: string }>
  expiresAt: number
}

interface FarmHomeViewModel {
  hydrated: boolean               // false 期间视觉层可整体隐藏舞台(FIDELITY §7 防闪烁)
  state: FarmHomeState
  dayNumber: number               // 顶栏/任务板 DAY N
  streak: number
  henName: string | null
  learnedToday: number            // 今日已完成项
  dailyTarget: number             // 固定 4(新词)
  reviewCountToday: number        // ≤25
  estimatedMinutes: number
  eggStock: number
  eggsEarnedToday: number         // 任务板「奖励 ×N」
  incubating: IncubatingEggVM[]   // 巢位占用即 F4 egg-slot 的 is-incubating
  chicksTotal: number
  chicksVisible: FarmChickVM[]    // ≤40
  chicksInCoop: number
  rescueCount: number             // 待救 ×N;0 的展示方式见 §12
  cooking: CookingState
  overlay: FarmOverlay
  chat: ChickChatVM | null
  motionEnabled: boolean
}
```

明确**不进** VM 的运行时表现(全部归视觉层,与母版 JS 一致):散步目标与路径、
朝向镜像、深度 zIndex、相遇互动脚本与表情符、避障框、拖拽中的临时坐标。
架构只持久化 `CHICK_PLACED` 的落点(散步中心)与 `motionEnabled`。
随机散步某时刻的位置是运行状态,不持久化(BASELINE_MANIFEST §5)。

## 5. 事件与副作用

```ts
type FarmHomeEvent =
  | { type: 'NAME_HEN'; name: string }
  | { type: 'START_DAILY_LESSON' }                                  // 导航去学习流
  | { type: 'DAILY_LESSON_COMPLETED'; newWords: number; reviews: number } // 学习流回调
  | { type: 'OPEN_EGG_PANEL' } | { type: 'CLOSE_EGG_PANEL' }
  | { type: 'TOGGLE_HATCHERY_POP' } | { type: 'TOGGLE_RESCUE_POP' }
  | { type: 'ALLOCATE_EGG_TO_HATCH' }                               // 面板或孵化棚气泡内按钮
  | { type: 'PUT_EGG_IN_PAN' } | { type: 'START_FRYING' } | { type: 'FRYING_DONE' }
  | { type: 'FEED_CHICK'; chickId?: string }                        // 缺省=随机(V-6)
  | { type: 'OPEN_RESCUE' }                                         // 导航去救援屏(后续屏)
  | { type: 'CHICK_CHAT'; chickId: string; neighborIds: string[] }  // 邻居由视觉层按几何挑选
  | { type: 'CHAT_DISMISSED' }
  | { type: 'CHICK_PLACED'; chickId: string; home: StagePoint }     // 拖拽落点(逻辑坐标)
  | { type: 'SET_MOTION'; enabled: boolean }
  | { type: 'DAY_ROLLOVER'; dayKey: string }                        // application 内部触发
  | { type: 'OPEN_PARENT' }
```

| 事件 | 持久化副作用 | 其他副作用 |
|---|---|---|
| NAME_HEN | farmState.henName | — |
| DAILY_LESSON_COMPLETED | session.completed、eggStock+=、meta(streak/totalDays) | — |
| ALLOCATE_EGG_TO_HATCH | eggStock-1、incubating+槽位 | — |
| PUT_EGG_IN_PAN | eggStock-1、cooking='raw' | — |
| START_FRYING | cooking='cooking' | 视觉层计时,结束派 FRYING_DONE |
| FRYING_DONE | cooking='ready' | — |
| FEED_CHICK | cooking='empty' | 视觉层飞蛋/转圈动画(母版 feedChick 行为) |
| CHICK_CHAT | seen.lastSeenAt 批量更新 | TTS 播 primary 的单词(全局音频原则 SPEC §2.6) |
| CHICK_PLACED | chicks.homeX/homeY | — |
| SET_MOTION | settings.motionEnabled | 视觉层启停散步/互动调度 |
| DAY_ROLLOVER | 到期蛋→chicks、清 incubating、重建 session | — |
| START_DAILY_LESSON / OPEN_RESCUE / OPEN_PARENT | — | 路由导航 |

抽词逻辑(CHICK_CHAT):domain `staleness.ts` 按 `P ∝ (距 lastSeenAt 天数 + 1)²`
从已学词抽 `1 + neighborIds.length` 个不重复词;只有 primary 播音,其余仅气泡(SPEC §2.1)。

## 6. Dexie 数据结构与迁移

### 6.1 原则

词库(words)**保持打包进代码**,不进 IndexedDB:静态数据随应用版本走,离线天然可用、
免迁移;DB 只存学习与农场状态。SPEC §6 的 words 表按此理解为"数据模型字段定义"。

### 6.2 v2 Schema(数据库名 `pipienglish`,现 version 1)

```ts
db.version(2).stores({
  cards:    'wordId, due',          // 不变
  sessions: 'date',                 // 不变
  kv:       'key',                  // 不变:meta / farmState / settings
  chicks:   'chickId, bornOn',      // 新增
  seen:     'wordId, lastSeenAt',   // 新增
  rescue:   'wordId, capturedAt',   // 新增
  ink:      'id, wordId, date',     // 新增(预留):手写字迹缩略图,v0.3 用,现在建表免二次迁移
}).upgrade(async tx => { /* §6.3 */ })
```

### 6.3 v1 → v2 迁移(upgrade 内,事务性)

v1 的 `kv['farm']` 形如 `{ henName, chicks: number, pendingEggs: [{date, n}] }`:

1. `chicks`(数字)→ 生成 N 条 `Chick{ source:'migration', bornOn: meta.installDate ?? 迁移日, home:null }`;
2. `pendingEggs` 中 `date < 迁移日` 的 → 直接孵化为 Chick(旧模型本就次日自动孵化);
3. `pendingEggs` 中 `date == 迁移日` 的 → 填入 `incubating` 槽位(≤3),溢出部分记入 `eggStock`
  (新模型给了它们"当年没有的选择权",不丢失任何资产);
4. 写入新 `kv['farmState']{ henName, eggStock, incubating, cooking:'empty' }`,删除旧 `kv['farm']`;
5. `seen` 以 `cards.last_review` 初始化(无记录的词不建行,首次见面时再写);
6. `kv['settings']` 初始化 `{ motionEnabled: !prefers-reduced-motion }`(运行时读取,存储只记显式选择)。

### 6.4 备份格式

导出版本号 v1 → **v2**:包含全部 7 表。导入兼容 v1(套用同一迁移变换)与 v2;
Date 字段序列化/反序列化规则沿用现实现。家长页每周导出提醒不变(SPEC §6 硬需求)。

## 7. 离线、失败、空数据与恢复

1. **冷启动(含断网)**:全部资产 SW 预缓存(FIDELITY §6);启动序列 = 打开 DB →
   necessary migration → `DAY_ROLLOVER` 检查 → 组装 VM → `hydrated=true`。
   比例计算完成前舞台可整体隐藏(FIDELITY §7),隐藏策略归视觉层。
2. **时钟守卫**:app 启动、`visibilitychange→visible`、`focus`、以及 60s 间隔守卫
   四处同时做两件事:重算 dayKey(变化即派 `DAY_ROLLOVER`,幂等)+ 检查孵化到期
   (`now ≥ hatchesAt` 即结算,孵化可在使用中破壳)。iPad PWA 隔夜回前台是主场景。
3. **学习中途崩溃**:每答一题即持久化 `doneCount`(v0.1 已如此),重开从断点续;
   煎蛋中途崩溃:`cooking` 落库值只有 `empty/raw/ready`(`cooking` 烹饪动画态**不落库**,
   `START_FRYING` 不写库、`FRYING_DONE` 才写 `ready`)→ 崩溃恢复为 `raw`,蛋不丢、可重新开火。
4. **TTS 不可用**(离线且设备无本地英语语音):功能不阻塞,气泡/卡片正常,仅无声;
   是否需要温和提示归视觉层定(§12)。
5. **空数据态**:`chicksTotal=0` + `first_visit` = 空农场(母鸡 + 小皮,DESIGN_BRIEF 4-1);
   `rescueCount=0`、`incubating=[]`、`eggStock=0` 的展示见 §12。
6. **存储韧性**:启动时 `navigator.storage.persist()`;备份出口不变;
   资产加载失败不做任何"临时替换素材"(契约 §5),仅记录错误。

## 8. 语义组件骨架(无视觉主张)

```tsx
// features/farm-f4/FarmHomeScreen.tsx —— 容器,不含样式判断
function FarmHomeScreen() {
  const { vm, dispatch } = useFarmHome()          // application 桥
  return <FarmStage vm={vm} dispatch={dispatch} /> // FarmStage 及其下全部视觉组件归 Codex
}

// stage/stagePoint.ts —— 纯函数,Claude 提供并测试(FIDELITY §4 公式)
function toStagePoint(clientX: number, clientY: number,
                      stageRect: DOMRect, scale: number): StagePoint {
  return { x: (clientX - stageRect.left) / scale, y: (clientY - stageRect.top) / scale }
}

// stage/useStageScale.ts —— scale = min(W/1194, H/834),含安全区;CSS 落地归 Codex
```

Codex 校验清单(契约 §3"校验状态是否足以呈现设计"):VM 是否覆盖 F4 页面每个可见数字与
开关 —— 顶栏 5 胶囊(今日单词/鸡蛋/小鸡/孵化中/动效)、任务板(DAY N/进度/奖励/连胜)、
孵化棚(槽位/状态行)、救援(×N)、鸡蛋面板全部文案变量。缺口回给 Claude 补 VM,不自行造状态。

## 9. 测试边界

| 层 | 工具 | 覆盖 | 责任 |
|---|---|---|---|
| domain | Vitest 纯单测 | 蛋经济规则(发蛋幂等/分配守卫/次日孵化)、dailyPlan(≤25/最过期优先)、staleness 权重分布、streak、翻转结算 | Claude |
| application | Vitest + fake-indexeddb | v1→v2 迁移(用 v0.1 真实形状夹具)、用例全流程(完成→发蛋→分配→翻转→+1 小鸡)、煎蛋崩溃恢复、备份 v1/v2 导入 | Claude |
| 状态机 | Vitest | 三态迁移矩阵 + 守卫拒绝表 + overlay 互斥 | Claude |
| shared | Vitest | `toStagePoint` 数学(含缩放/安全区偏移用例) | Claude |
| 视觉回归 | 截图矩阵(FIDELITY §9:GM-01/IP-11/IP-13/RM/OFF/DRAG) | 黄金截图、拖拽无空气墙、reduced-motion、断网冷启动 | Codex |
| 真机 | 人工 | iPad Pro PWA、触控、安全区、小皮确认 | Codex 整理,小皮/爸爸裁决 |

合并门槛执行契约 §10:架构测试绿 ≠ 页面完成;截图一致但假数据 = 只是样板。

## 10. F4 正式接入分阶段实施顺序

每阶段完成即按契约 §9 流程走一遍(状态接口 → 视觉 → 自动检查 → 真机 → 确认 → 锁定)。

- **阶段 A · 纯架构重构(V-8 裁决后修订)**
  目录重构(§1)、Dexie v2 + 迁移 + 测试、蛋经济/陈旧度/翻转用例落地;
  **删除全部旧视觉组件**(SVG 角色、旧屏 UI、旧换肤样式),回归基准改为
  单元/集成测试 + 带 `DEV PLACEHOLDER` 标记的内部开发壳(仅驱动逻辑验证)。
  DoD:全测试绿 + 开发壳可走通"完成学习→发蛋→分配→24h 孵化"全链路。
- **阶段 B · 固定舞台外壳**
  `useStageScale`/`toStagePoint`/横竖屏与 Split View 门槛逻辑(Claude);
  `.f4-viewport/.f4-bleed/.f4-stage` CSS 与竖屏引导视觉(Codex);
  资产复制 `design-samples/assets/* → public/assets/f4/`(母版不动,登记副本哈希)。
  DoD:GM-01/IP-11/IP-13 三个视口下舞台等比 + 背景延展正确。
- **阶段 C · daily_incomplete 单状态接真数据**
  FarmHome 状态机 + VM + 事件桥(Claude);Codex 把 F4 母版 HTML/CSS/JS 移植为
  React 视觉层(散步/互动/拖拽脚本平移进 `visual/`),顶栏与任务板绑 VM。
  文案模板差异先走 §11 V-2 确认。DoD:真实数据渲染 + 黄金截图差异仅限已批准文案。
- **阶段 D · 蛋经济闭环**
  完成学习 → 发蛋 → 面板分配 → 孵化/煎蛋/喂食 → 次日翻转孵出小鸡 → 农场 +1;
  救援入口计数真实化(救援屏本体属后续屏)。DoD:两日连续真机走查全链路。
- **阶段 E · 群聊 + 拖拽持久化**
  CHICK_CHAT(陈旧度抽词 + TTS + seen 更新;多气泡行为先过 §11 V-4)、
  CHICK_PLACED 持久化、40/鸡舍收纳数据侧。
- **阶段 F · 三状态补全**
  first_visit(场景名牌起名)与 daily_complete(连胜展示牌 + 游戏入口木牌):
  依赖 P0 资产与新视觉状态确认(§11 V-3),按变更单流程推进。
- **阶段 G · PWA 收口与部署(2026-07-17 爸爸定:GitHub Pages)**
  manifest(standalone + landscape)、图标从 `pwa-icon-farm-master.png` 无损派生
  (180/192/512/maskable,禁止 AI 重画)、SW 预缓存清单、OFF/RM 回归、真机验收;
  Vite `base` 子路径 + PWA scope 适配 GitHub Pages;
  **GitHub 云备份**:打开时若距上次备份 >24h 且有网 → 备份 JSON 经 GitHub API
  推到本仓库 `backups` 分支(fine-grained PAT 仅存设备本地,绝不进公开代码);
  家长页增"从云端恢复"。部署管道建议在阶段 B/C 期间先行搭好,服务每屏真机验收。

## 11. ⚠️ 可能改变 F4 视觉的架构决策(单独列出,全部待确认,不自行决定)

| # | 事项 | 冲突点 | 建议(仅供裁决) | 裁决人 |
|---|---|---|---|---|
| V-1 | ✅ **已裁决(2026-07-17 爸爸)**:孵化固定 24 小时;取消状态行时间/倒计时条;点击孵化中的蛋显示剩余时间 | 遗留视觉工作:状态行移除时间显示 + "点蛋看剩余"新交互 | Codex 按裁决出视觉方案,走变更单 | 小皮(显示形式) |
| V-2 | 顶栏/任务板文案接真实数据 | 母版为静态样板文案;真实日有复习数、DAY N、约 X 分钟、奖励 ×N 等变量 | **裁决方式已定(爸爸):Claude 出变量模板(见 §13)+ Codex 排版 → 联合出最终候选 → 小皮拍板** | 小皮 |
| V-3 | first_visit / daily_complete 两状态无母版 | 全新视觉状态(场景名牌起名、连胜展示牌、手写游戏入口木牌),P0 资产未产 | 阶段 F 前按资产协议生成 + 变更单 | 小皮 |
| V-4 | 小鸡群聊多气泡(SPEC §2.1) | 母版现为单角色气泡 + 脚本化双角色互动;"点一只、周围 2~3 只同时冒泡"是可见行为变化 | VM/事件已预留(ChickChatVM.others);视觉方案由 Codex 设计后确认再启用,未确认前先落"单气泡 + 真实抽词" | 爸爸 + 小皮 |
| V-5 | 小鸡可见 ≤40 + 鸡舍 ×N | 母版 6 只 / 8 分区;数量增长后的密度、分区扩展与鸡舍资产未定 | 数据侧我按"最新 40 可见"给;分区/密度参数归 Codex | Codex 提案,爸爸确认 |
| V-6 | 喂食目标:随机(母版) vs 选择小鸡(SPEC §2.4 手写游戏) | 两处交互不一致 | 首页蛋面板保持母版随机;手写游戏奖励屏再做"选择",各自成立 | 爸爸 |
| V-7 | rescueCount=0 时救援篮显示 | 母版固定"待救 ×2",无 0 态 | 隐藏或空篮(P2 已有空篮资产计划),Codex 出案 | 爸爸 |
| V-8 | ✅ **已裁决(2026-07-17 爸爸)**:最终落地前小皮不使用;以 F4 首页为唯一出发点,**废弃 Claude 早期制作的全部视觉元素**(SVG 角色、旧换肤样式、旧屏 UI) | 开发期仅允许带 `DEV PLACEHOLDER` 标记的内部开发壳(契约 §5),永不面向小皮 | 旧视觉组件在阶段 A 直接删除;各屏 UI 全部由 Codex 用真实 F4 资产逐屏新建 | 已定 |

## 12. 仍待视觉确认的状态缺口(供 Codex 排期,非架构决定)

first_visit 起名物件形态(DESIGN_BRIEF §2.6:不用居中大弹窗)/ daily_complete 连胜牌与木牌 /
rescue ×0 态 / 40+ 小鸡满员表现 / `isNewToday` 小鸡的登场表现 / TTS 不可用时是否提示 /
Split View 缩放 <0.72 的全屏提示样式 / 竖屏引导页 / `hydrated=false` 的启动遮罩。

## 13. V-2 · 首页文案变量模板(Claude 半边,交 Codex 排版后由小皮拍板)

约束:数字必须真实(契约 §10);任何地方不出现积压总数(SPEC §5.1);
语气遵守"永不惩罚"。`{}` 内为 VM 字段,候选文案供排版挑选与改写,定稿权在小皮。

**顶栏胶囊(结构与母版一致,仅数字变量化):**

| 胶囊 | 模板 |
|---|---|
| 今日单词 | `今日单词 {learnedToday} / {dailyTarget}` |
| 鸡蛋 | `鸡蛋 {eggStock}` |
| 小鸡 | `小鸡 {chicksTotal}` |
| 孵化中 | `孵化中 {incubating.length}` |
| 动效 | `动效:开/关`(母版原样) |

**任务板(daily_incomplete):**

- 眉题:`DAY {dayNumber} · 今日农场任务`
- 标题:`开始今天的单词!`(母版原样,不变量化)
- 正文,按 `reviewCountToday` 分两条:
  - =0:`认识 {dailyTarget} 个新朋友,完成后母鸡妈妈会下蛋哦。`
  - >0 候选 A:`先和 {reviewCountToday} 个老朋友打个招呼,再认识 {dailyTarget} 个新朋友。`
  - >0 候选 B:`{reviewCountToday} 个老朋友想你了!打完招呼再认识 {dailyTarget} 个新朋友。`
- 进度行:`今日进度 {learnedToday} / {totalItemsToday}`(分母=复习+新词全部任务项;
  若小皮觉得数字大,备选只显示新词 `{newDone} / 4`——两案都排出来给她选)
- 主按钮候选:`开始学习!` / `开始今天的单词!`(母版按钮含"4 个单词"字样,
  真实日任务不止新词,建议去掉具体数字,待小皮选)
- 底注:`约 {estimatedMinutes} 分钟 · 🥚 奖励 ×{eggsToEarn} · 连续第 {streak} 天`

**孵化棚(按 V-1 裁决改造):**

- 状态行:`孵化小屋 · {incubating.length} 颗孵化中`(**移除时间与进度显示**)
- 气泡正文:空位>0:`蛋会各自在巢里轻轻晃动,还可以放入 {3-n} 颗。`
  满员:`三个巢位都住进了小鸡宝宝,耐心等它们破壳吧。`(母版原文)
- **点蛋显示剩余(新交互)**候选:
  - A(剩余式):`还要 {h} 小时 {m} 分钟就破壳啦!`
  - B(时刻式):`明天 {HH:mm} 破壳!`(<1h 时:`马上就要破壳啦!`)

**救援入口:** `待救 ×{rescueCount}`;气泡:`有 {rescueCount} 只小鸡等你接回家`
(=0 态显示方式见 V-7,未裁决)。

**鸡蛋面板:** 余量 `剩余 {eggStock} 颗`;孵化选项副文案 `还有 {3-n} 个空巢位` /
`三个巢位都住满了`;煎蛋流程文案母版已完整,原样保留。

---

**下一步**:V-1 已裁决落档;V-2 等 Codex 排版候选 → 小皮拍板;V-8 见对话解释,等爸爸一句话确认。Claude 阶段 A(纯架构重构)已可开工;Codex 可并行准备阶段 B 舞台外壳。
