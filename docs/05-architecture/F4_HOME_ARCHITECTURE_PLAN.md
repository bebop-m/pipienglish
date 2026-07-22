# F4 长期农场 · 内部架构与实施方案 v2

> 作者:Claude(架构)。依据 `docs/03-workflow/CLAUDE_CODEX_VISUAL_CONTRACT.md` §4 交付格式。
> 本文**不含任何视觉主张**:不改 Token、不改布局、不替换素材。所有界面坐标均为
> **1194×834 逻辑坐标(stage pt)**。可能改变 F4 视觉的架构决策集中在 §11,一律待确认、不自行决定。

> **2026-07-19 规格同步状态:**长期农场目标契约已由爸爸裁决并通过 Claude 无条件一致性验收；详细产品算法以 [`../01-product/FARM_LONG_TERM_ECONOMY_PROPOSAL.md`](../01-product/FARM_LONG_TERM_ECONOMY_PROPOSAL.md) 为唯一输入。本文的 v2/v3 表示数据架构版本，不表示生产代码已经完成迁移。当前代码仍是 1 蛋、5 轮、三巢的旧闭环；§2–§9 描述目标架构，§10 的旧完成记录只作为历史，不得据此声称长期农场已上线。

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
    dailyPlan.ts             #   今日队列构建规则(复习≤6/新词4/热身/乱序;2026-07-17 复习上限 25→6)
    eggEconomy.ts            #   2 蛋必修、10 轮上限、价格与原子扣款(规则见 §2.2)
    hatchRarity.ts           #   单巢、83/15/2、10/36 隐藏保底与款式选择
    farmChapters.ts          #   36 完成日章节、可用内容兜底与顺序旅行
    meals.ts                 #   1/5/20 蛋料理状态与旅行退款
    staleness.ts             #   陈旧度加权抽词(SPEC §2.4)
    streak.ts                #   连胜与日期翻转规则
  application/               # 用例编排 + 持久化协调(可 import domain 与 db)
    db.ts                    #   Dexie v3 目标 Schema；v2 为现行生产基线(见 §6)
    usecases/                #   loadFarmHome / completeDailyLesson / placeEgg / hatchEgg /
                             #   startMeal / serveMeal / travel / favoriteChick /
                             #   buyDecoration / equipCosmetic / chickChat / rollover
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

// —— 长期农场域(2026-07-19 最终契约) ——
type ChickRarity = 'normal' | 'color' | 'special'
type MealPhase = 'raw' | 'ready'
type RecipeId = 'single_fried_egg' | 'picnic_platter' | 'celebration_feast'

interface IncubatingEgg {
  placedAt: number
  rarity: ChickRarity       // 放蛋事务中确定，破壳前 UI 不揭晓
  variantId: string
}
interface CookingMeal {
  recipeId: RecipeId
  eggCost: 1 | 5 | 20
  phase: MealPhase          // served 是业务动作，不是持久化状态
  startedAt: number
}
interface FarmState {
  henName: string | null
  eggStock: number
  activeSceneId: string
  acknowledgedSceneChapter: number
  incubating: IncubatingEgg | null                    // 单巢
  normalHatchStreak: number
  nonSpecialHatchStreak: number
  cookingMeal: CookingMeal | null
}
interface Chick {
  chickId: string
  bornOn: string
  source: 'hatch' | 'migration'
  sceneId: string
  rarity: ChickRarity
  variantId: string
  favorite: boolean
  homeX: number | null
  homeY: number | null
}
interface SceneMemory {
  sceneId: string
  celebrationPhotoCreatedAt: number | null
}
interface DecorationPlacement {
  sceneId: string
  itemId: string
  x: number | null
  y: number | null
}
interface OwnedCosmetic { itemId: string; acquiredAt: number }
interface CharacterLoadout {
  xiaopi: { headLook: string; outfit: string; accessory: string | null }
  mother: { headwear: string | null; neckwear: string | null }
}
type SceneLoadouts = Record<string, CharacterLoadout>  // 每个场景独立保存最后穿戴

// —— 记忆通道共享 ——
interface SeenRecord { wordId: string; lastSeenAt: number }   // 陈旧度抽词(SPEC §2.4)
interface RescueEntry { wordId: string; capturedAt: number }  // 救援队列(SPEC §2.5)

// —— 元信息 ——
interface MetaState { streak: number; lastDoneDate: string | null; totalDays: number }
interface Settings { motionEnabled: boolean }
```

### 2.2 鸡蛋、单巢、料理与购买规则

1. 完成当日必修 → `eggStock += 2`；写词游戏每日本地日前 10 轮各 `+1`，之后纯加练。两类奖励分别幂等。
2. 放蛋需 `eggStock>0 && incubating===null`；同一 Dexie 事务内扣 1 蛋、按 §2.3 确定 `rarity/variantId`、写入 `placedAt`。`hatchesAt=placedAt+24h` 为派生值，孵化中常驻显示 `remainingMs`。
3. 到期结算生成归属于**结算时** `activeSceneId` 的 `Chick`，每颗蛋必出鸡；应用打开、恢复可见、focus 与 60s 守卫均可幂等触发。
4. 料理成本固定为单份 1、野餐 5、庆典 20。开始时原子扣蛋并落 `raw`，动画完成落 `ready`；单份选择有效小鸡、群体料理作用于当前场景，享用后清空。无鸡、余额不足或已有料理时拒绝且不扣蛋。
5. `raw/ready` 料理下旅行必须先选择：取消旅行去享用，或同一事务全额退 `eggCost`、清空料理、推进场景。快速重复点击只能成功一次。
6. 场景贴纸每章价格 90，角色装扮完整目录每章 80；购买、收藏替换与摆放均以原子事务维护库存和所有权。已购装扮所有权全局有效，但装备、替换和卸下只写入当前 `sceneId` 的 `SceneLoadouts`，不改动其他场景。无真实货币、限时、折扣或属性收益。
7. 蛋不过期、不没收，未购买商品永久保留；“只做必修”仍可在每日孵化后每章积累约 36 颗自由蛋。
8. 每个场景定义免费小皮默认装束。首次进入时由默认值初始化，之后恢复该场景上次穿戴；“恢复默认”也只重置当前场景。免费默认装束不写入收费 `cosmetics` 所有权。
9. 场景 1 的 F4 独立鸡蛋只保留为旧场景兼容实现。从场景 2 起，场景定义保存场景专属 `hatcheryVisualStates[]`，运行时根据无蛋、有蛋、孵化剩余时间分段和破壳/出壳结果选择一张完整鸡窝贴图，不再提供鸡蛋叠层的巢心锚点。

### 2.3 稀有算法、章节和可见集合

- 抽取顺序必须固定：`nonSpecialHatchStreak>=35` 直接特殊；否则按普通 83 / 异色 15 / 特殊 2 抽取；若 `normalHatchStreak>=9` 且抽到普通，升级为异色。
- 特殊清空两个计数器；异色清普通计数、非特殊计数 `+1`；普通两个计数均 `+1`。特殊优先于异色保底，计数跨场景。
- 每章核心包提供 2 款异色和 1 款特殊；从全部已解锁款式中未拥有优先。款式池为空是发布/数据错误，不得通过空蛋降级。
- `eligibleChapter = 1 + floor(totalDays/36)`；`enterableChapter = min(eligibleChapter, availableChapter)`。`acknowledgedSceneChapter` 不得超过本地可用章节；更新后按序补放庆祝。
- `activeSceneId` 是唯一的学习、单巢和厨房场景；`viewedSceneId` 只属于路由/VM 瞬时态，回访不落成当前旅程。
- 每场景可见集合 = 全部 favorite（最多 8）+ 其余按出生时间新到旧补足至 40。第 41 只先完成入场动画，再将最早未收藏个体收进鸡舍。鸡舍个体仍可点按发音和收藏。

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
  - `overlay: none | egg_panel | hatchery_pop | rescue_pop | coop | kitchen | map | sticker_catalog | wardrobe`；
  - `viewedSceneId` 为瞬时浏览态；未设置时等于 `activeSceneId`，不持久化成旅程推进；
  - `cookingMeal` 持久化，overlay 不持久化(冷启动回 `none`)。
- **守卫**:`START_DAILY_LESSON` 仅 `daily_incomplete`;`ALLOCATE_EGG_TO_HATCH` 需
  `eggStock>0 && incubating===null`;`START_MEAL` 需余额足、当前场景有鸡且 `cookingMeal===null`；
  `SERVE_MEAL` 需 `cookingMeal.phase==='ready'`;学习、孵化和料理仅在 `viewedSceneId===activeSceneId` 显示；`NAME_HEN` 仅 `first_visit`。

## 4. 视觉层消费的只读 ViewModel

```ts
/** 所有坐标均为 1194×834 逻辑坐标 */
interface StagePoint { x: number; y: number }

type FarmHomeState = 'first_visit' | 'daily_incomplete' | 'daily_complete'
type FarmOverlay   = 'none' | 'egg_panel' | 'hatchery_pop' | 'rescue_pop' | 'coop' | 'kitchen' | 'map' | 'sticker_catalog' | 'wardrobe'

interface IncubatingEggVM { placedAt: number; hatchesAt: number; remainingMs: number }
// rarity/variantId 在破壳前不得进入儿童 VM；remainingMs 常驻友好显示。

interface FarmChickVM {
  chickId: string
  bornOn: string
  sceneId: string
  rarity: ChickRarity
  variantId: string
  favorite: boolean
  home: StagePoint | null   // 手动散步中心;null = 视觉层分区安排(F4 chickHomes 分区算法归视觉层)
  isNewToday: boolean       // 今晨刚孵出,视觉层可做一次性登场表现(表现形式待 Codex)
}

interface ChickChatVM {     // 群聊(§11 V-4,行为需视觉确认后启用)
  primary: { chickId: string; word: string; meaning: string }   // 播 TTS 的那只
  others:  Array<{ chickId: string; word: string; meaning: string }>
  expiresAt: number
}

interface DecorationCatalogItemVM {
  itemId: string
  kind: 'small' | 'medium' | 'landmark'
  eggCost: 5 | 10 | 20
  releaseTier: 'core' | 'extension'
  owned: boolean
  placed: boolean
}

interface FarmHomeViewModel {
  hydrated: boolean               // false 期间视觉层可整体隐藏舞台(FIDELITY §7 防闪烁)
  state: FarmHomeState
  activeSceneId: string
  viewedSceneId: string
  isViewingCurrentJourney: boolean
  eligibleChapter: number
  availableChapter: number
  pendingTravelChapters: number[]
  dayNumber: number               // 顶栏/任务板 DAY N
  streak: number
  henName: string | null
  learnedToday: number            // 今日已完成项
  dailyTarget: number             // 固定 4(新词)
  reviewCountToday: number        // ≤6(2026-07-17 爸爸定)
  estimatedMinutes: number
  eggStock: number
  eggsEarnedToday: number         // 任务板「奖励 ×N」
  incubating: IncubatingEggVM | null
  chicksTotal: number             // 当前查看场景总数
  chicksVisible: FarmChickVM[]    // ≤40
  chicksInCoop: number
  favoriteCount: number           // ≤8
  rescueCount: number             // 待救 ×N;0 的展示方式见 §12
  cookingMeal: CookingMeal | null
  availableRecipes: Array<{ recipeId: RecipeId; eggCost: 1 | 5 | 20; enabled: boolean }>
  decorationCatalog: DecorationCatalogItemVM[]
  ownedCosmeticIds: string[]
  loadout: CharacterLoadout        // 已按 currentSceneId 解析的当前场景穿戴
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
  | { type: 'OPEN_HANDWRITING_GAME' }                               // 完成态导航去写词游戏
  | { type: 'DAILY_LESSON_COMPLETED'; newWords: number; reviews: number } // 学习流回调
  | { type: 'OPEN_EGG_PANEL' } | { type: 'CLOSE_EGG_PANEL' }
  | { type: 'TOGGLE_HATCHERY_POP' } | { type: 'TOGGLE_RESCUE_POP' }
  | { type: 'ALLOCATE_EGG_TO_HATCH' }
  | { type: 'START_MEAL'; recipeId: RecipeId }
  | { type: 'MEAL_ANIMATION_DONE' }
  | { type: 'SERVE_MEAL'; chickId?: string }
  | { type: 'FAVORITE_CHICK'; chickId: string; replaceChickId?: string }
  | { type: 'VIEW_SCENE'; sceneId: string } | { type: 'RETURN_TO_ACTIVE_SCENE' }
  | { type: 'TRAVEL_TO_NEXT_SCENE'; pendingMealChoice?: 'serve_first' | 'refund' }
  | { type: 'BUY_DECORATION'; itemId: string } | { type: 'PLACE_DECORATION'; itemId: string; home: StagePoint }
  | { type: 'BUY_COSMETIC'; itemId: string } | { type: 'EQUIP_COSMETIC'; itemId: string | null; slot: string }
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
| DAILY_LESSON_COMPLETED | session.completed、eggStock+=2、meta(streak/totalDays) | — |
| ALLOCATE_EGG_TO_HATCH | eggStock-1、写入单个 incubating 与隐藏外观 | — |
| START_MEAL | eggStock-=eggCost、cookingMeal='raw' | 播放对应批量煎制动画 |
| MEAL_ANIMATION_DONE | cookingMeal='ready' | — |
| SERVE_MEAL | cookingMeal=null；20 蛋首次活动可写 SceneMemory | 单鸡/野餐/庆典动画 |
| FAVORITE_CHICK | chicks.favorite 原子替换 | — |
| TRAVEL_TO_NEXT_SCENE | 必要时退款并清 cookingMeal；推进 activeSceneId/acknowledged | 旅行转场 |
| BUY/PLACE_DECORATION | 扣款、所有权与场景坐标 | — |
| BUY/EQUIP_COSMETIC | 扣款、所有权或装备槽 | — |
| CHICK_CHAT | seen.lastSeenAt 批量更新 | TTS 播 primary 的单词(全局音频原则 SPEC §2.6) |
| CHICK_PLACED | chicks.homeX/homeY | — |
| SET_MOTION | settings.motionEnabled | 视觉层启停散步/互动调度 |
| DAY_ROLLOVER | 到期蛋→chicks、清 incubating、重建 session | — |
| START_DAILY_LESSON / OPEN_HANDWRITING_GAME / OPEN_RESCUE / OPEN_PARENT | — | 路由导航 |

抽词逻辑(CHICK_CHAT):domain `staleness.ts` 按 `P ∝ (距 lastSeenAt 天数 + 1)²`
从已学词抽 `1 + neighborIds.length` 个不重复词;只有 primary 播音,其余仅气泡(SPEC §2.1)。

## 6. Dexie 数据结构与迁移

### 6.1 原则

词库(words)**保持打包进代码**,不进 IndexedDB:静态数据随应用版本走,离线天然可用、
免迁移;DB 只存学习与农场状态。SPEC §6 的 words 表按此理解为"数据模型字段定义"。

### 6.2 v3 目标 Schema(数据库名 `pipienglish`,当前生产为 v2)

```ts
db.version(3).stores({
  cards:    'wordId, due',          // 不变
  sessions: 'date',                 // 不变
  kv:       'key',                  // 不变:meta / farmState / settings
  chicks:   'chickId, sceneId, bornOn, [sceneId+favorite]',
  seen:     'wordId, lastSeenAt',
  rescue:   'wordId, capturedAt',
  ink:      'id, wordId, date',
  decorations: '[sceneId+itemId], sceneId',
  cosmetics: 'itemId, acquiredAt',
  sceneMemory: 'sceneId',
}).upgrade(async tx => { /* §6.3 */ })
```

### 6.3 v2 → v3 迁移(upgrade 内,事务性)

1. 所有现有 `Chick` 写入 `sceneId='scene-1'`、`rarity='normal'`、默认 `variantId`、`favorite=false`；数量不变。
2. 现有 `incubating[]` 按 `placedAt` 排序，只保留最早一颗为单巢蛋；其余每颗完整退回 `eggStock`。保留蛋使用普通外观且不推进新保底。
3. 初始化 `activeSceneId='scene-1'`、`acknowledgedSceneChapter=1`、两个保底计数器为 0、`cookingMeal=null`，并将旧全局 `CharacterLoadout` 写入 `sceneLoadouts['scene-1']`。其他场景首次进入时从各自默认装束初始化。
4. 初始化空 `decorations/cosmetics/sceneMemory`；现有鸡蛋、学习记录、连胜、完成日、见面时间和救援队列均原样保留。
5. 同一转换函数供数据库升级及 v1/v2 备份导入使用；事务失败整体回滚，不能出现部分迁移。

以下 v1 → v2 规则只用于理解现有生产数据来历，不是新实现目标：

v1 的 `kv['farm']` 形如 `{ henName, chicks: number, pendingEggs: [{date, n}] }`:

1. `chicks`(数字)→ 生成 N 条 `Chick{ source:'migration', bornOn: meta.installDate ?? 迁移日, home:null }`;
2. `pendingEggs` 中 `date < 迁移日` 的 → 直接孵化为 Chick(旧模型本就次日自动孵化);
3. `pendingEggs` 中 `date == 迁移日` 的 → 填入 `incubating` 槽位(≤3),溢出部分记入 `eggStock`
  (新模型给了它们"当年没有的选择权",不丢失任何资产);
4. 写入新 `kv['farmState']{ henName, eggStock, incubating, cooking:'empty' }`,删除旧 `kv['farm']`;
5. `seen` 以 `cards.last_review` 初始化(无记录的词不建行,首次见面时再写);
6. `kv['settings']` 初始化 `{ motionEnabled: !prefers-reduced-motion }`(运行时读取,存储只记显式选择)。

### 6.4 备份格式

导出版本升级为 **v3**，包含场景、小鸡稀有外观与收藏、贴纸与坐标、衣柜所有权与各场景独立 `sceneLoadouts`、料理和章节合照。导入兼容 v1/v2/v3，旧版本统一经过 §6.3 转换；Date 字段序列化/反序列化规则沿用现实现。家长页每周导出提醒不变(SPEC §6 硬需求)。

## 7. 离线、失败、空数据与恢复

1. **冷启动(含断网)**:全部资产 SW 预缓存(FIDELITY §6);启动序列 = 打开 DB →
   necessary migration → `DAY_ROLLOVER` 检查 → 组装 VM → `hydrated=true`。
   比例计算完成前舞台可整体隐藏(FIDELITY §7),隐藏策略归视觉层。
2. **时钟守卫**:app 启动、`visibilitychange→visible`、`focus`、以及 60s 间隔守卫
   四处同时做两件事:重算 dayKey(变化即派 `DAY_ROLLOVER`,幂等)+ 检查孵化到期
   (`now ≥ hatchesAt` 即结算,孵化可在使用中破壳)。iPad PWA 隔夜回前台是主场景。
3. **学习与料理崩溃**:每答一题即持久化 `doneCount`，重开从断点续。料理只落 `raw/ready`；动画中崩溃保持或恢复为 `raw`，不重扣蛋；`ready` 恢复后可继续享用。旅行退款事务需幂等。
4. **TTS 不可用**(离线且设备无本地英语语音):功能不阻塞,气泡/卡片正常,仅无声;
   是否需要温和提示归视觉层定(§12)。
5. **空数据态**:`chicksTotal=0` + `first_visit` = 空农场(母鸡 + 小皮,DESIGN_BRIEF 4-1);
   `rescueCount=0`、`incubating=null`、`eggStock=0` 的展示见 §12。
6. **内容脱期兜底**:`eligibleChapter>availableChapter` 时总完成日继续累计；儿童 VM 不暴露不可用庆祝、地图入口或旅行，`acknowledgedSceneChapter` 不越界。更新后按序补放，不允许读取缺失定义导致崩溃。
7. **存储韧性**:启动时 `navigator.storage.persist()`;备份出口不变;
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
| domain | Vitest 纯单测 | 必修 2 蛋与游戏 10 轮幂等、单巢守卫、83/15/2 与 10/36 保底、36 日章节、价格、1/5/20 料理、dailyPlan、staleness、streak | Claude |
| application | Vitest + fake-indexeddb | v2→v3 零损失迁移、放蛋时原子定外观、收藏轮换、料理崩溃与旅行退款、内容脱期兜底、贴纸/衣柜交易、场景独立穿戴与默认回退、场景专属鸡窝状态与剩余时间分段选择、v1/v2/v3 备份导入 | Claude |
| 状态机 | Vitest | 三态迁移矩阵 + 守卫拒绝表 + overlay 互斥 | Claude |
| shared | Vitest | `toStagePoint` 数学(含缩放/安全区偏移用例) | Claude |
| 视觉回归 | 截图矩阵(FIDELITY §9:GM-01/IP-11/IP-13/RM/OFF/DRAG) | 黄金截图、拖拽无空气墙、reduced-motion、断网冷启动 | Codex |
| 真机 | 人工 | iPad Pro PWA、触控、安全区、小皮确认 | Codex 整理,小皮/爸爸裁决 |

合并门槛执行契约 §10:架构测试绿 ≠ 页面完成;截图一致但假数据 = 只是样板。

> 历史实施顺序已移至 [`archive/F4_HOME_ARCHITECTURE_PLAN_SECTION_10_HISTORY.md`](archive/F4_HOME_ARCHITECTURE_PLAN_SECTION_10_HISTORY.md)。AI 默认不读取；仅追溯旧阶段时按需打开。

## 11. ⚠️ 可能改变 F4 视觉的架构决策(单独列出,全部待确认,不自行决定)

| # | 事项 | 冲突点 | 建议(仅供裁决) | 裁决人 |
|---|---|---|---|---|
| V-1 | ✅ **已被 2026-07-19 新裁决覆盖**:孵化仍为固定 24 小时，但改为单巢且常驻友好剩余时间 | 旧三巢与隐藏时间资产/文案全部退役 | 按长期农场原型重新验收 | 爸爸已定 |
| V-2 | ✅ **已裁决(2026-07-17 小皮)**:选择 Codex 排版候选 B;正文用“老朋友想你了”,进度显示全部任务,主按钮为“开始学习!” | 母版为静态样板文案;真实日有复习数、DAY N、约 X 分钟、奖励 ×N 等变量 | Codex 在阶段 C 按 §13 定稿绑定真实 VM;变更记录 `F4-CHG-001` | 小皮已批准 |
| V-3 | 🟡 **工程候选已实现(2026-07-17)**:first_visit / daily_complete 两状态无母版 | 场景名牌、连胜牌和手写入口已用可替换 CSS 物件实现；正式 P0 PNG 未产、未登记基准 | 先上线预览候选；正式位图按资产协议生成并以真机截图交小皮锁定，工程接口不变；变更记录 `F4-CHG-005` | 小皮待视觉锁定 |
| V-4 | 小鸡群聊多气泡(SPEC §2.1) | 母版现为单角色气泡 + 脚本化双角色互动;"点一只、周围 2~3 只同时冒泡"是可见行为变化 | VM/事件已预留(ChickChatVM.others);视觉方案由 Codex 设计后确认再启用,未确认前先落"单气泡 + 真实抽词" | 爸爸 + 小皮 |
| V-5 | ✅ 每场景可见 ≤40 + 鸡舍 ×N + 最多 8 只自主收藏 | 收藏优先、其余按最新补足；轮换跳过收藏 | 视觉只需设计低频保险丝与一步小星星入口 | 爸爸已定 |
| V-6 | ✅ 写词游戏只发生鸡蛋；喂食由厨房 1 蛋料理选择有效小鸡 | 不再存在随机/立即喂食分叉 | 游戏结算与厨房彻底解耦 | 爸爸已定 |
| V-7 | rescueCount=0 时救援篮显示 | 母版固定"待救 ×2",无 0 态 | 隐藏或空篮(P2 已有空篮资产计划),Codex 出案 | 爸爸 |
| V-8 | ✅ **已裁决(2026-07-17 爸爸)**:最终落地前小皮不使用;以 F4 首页为唯一出发点,**废弃 Claude 早期制作的全部视觉元素**(SVG 角色、旧换肤样式、旧屏 UI) | 开发期仅允许带 `DEV PLACEHOLDER` 标记的内部开发壳(契约 §5),永不面向小皮 | 旧视觉组件在阶段 A 直接删除;各屏 UI 全部由 Codex 用真实 F4 资产逐屏新建 | 已定 |

## 12. 仍待视觉确认的状态缺口(供 Codex 排期,非架构决定)

first_visit / daily_complete 正式 P0 位图替换与视觉锁定 / rescue ×0 态 / 40+ 小鸡与 8 收藏表现 /
单巢常驻时间 / 三类破壳 / 章节地图 / 鸡舍 / 三档厨房 / 贴纸摆放 / 分层衣柜 /
`isNewToday` 小鸡的登场表现 / TTS 不可用时是否提示 /
Split View 缩放 <0.72 的全屏提示样式 / 竖屏引导页 / `hydrated=false` 的启动遮罩。

## 13. V-2 · 首页文案变量定稿(候选 B,小皮已批准)

约束:数字必须真实(契约 §10);任何地方不出现积压总数(SPEC §5.1);
语气遵守"永不惩罚"。`{}` 内为 VM 字段。

**2026-07-17 小皮裁决:**选择 V-2 排版候选 B(“简单直接”):

- `reviewCountToday > 0` 正文采用候选 B;
- 进度采用全部任务 `{learnedToday} / {totalItemsToday}`;
- 主按钮采用 `开始学习!`;
- `reviewCountToday = 0` 的既定正文不变;
- 对照截图:`visual-regression/v2-copy-candidates/V2-B-1194x834.png`。

**顶栏胶囊(结构与母版一致,仅数字变量化):**

| 胶囊 | 模板 |
|---|---|
| 今日单词 | `今日单词 {newWordsLearnedToday} / {dailyTarget}` |
| 鸡蛋 | `鸡蛋 {eggStock}` |
| 小鸡 | `小鸡 {chicksTotal}` |
| 孵化中 | `孵化中 {incubating ? 1 : 0}` |
| 动效 | `动效:开/关`(母版原样) |

**任务板(daily_incomplete):**

- 眉题:`DAY {dayNumber} · 今日农场任务`
- 标题:`开始今天的单词!`(母版原样,不变量化)
- 正文,按 `reviewCountToday` 分两条:
  - =0:`认识 {dailyTarget} 个新朋友,完成后母鸡妈妈会下蛋哦。`
  - >0 定稿:`{reviewCountToday} 个老朋友想你了!打完招呼再认识 {dailyTarget} 个新朋友。`
- 进度行定稿:`今日进度 {learnedToday} / {totalItemsToday}`(分母=复习+新词全部任务项)
- 主按钮定稿:`开始学习!`(母版按钮含"4 个单词"字样,真实日任务不止新词,故去掉具体数字)
- 底注:`约 {estimatedMinutes} 分钟 · 🥚 奖励 ×{eggsToEarn} · 连续第 {streak} 天`

**孵化棚(2026-07-19 最终裁决):**

- 状态行空闲:`孵化小屋 · 等一颗鸡蛋`；占用:`孵化小屋 · 还要 {friendlyRemaining}`。
- 气泡正文空闲:`放进一颗鸡蛋，明天会认识一只新朋友。`；占用:`小鸡宝宝正在里面慢慢长大。`
- 只显示一个巢位，不展示稀有度、概率或保底进度；剩余时间常驻但使用友好粒度，不制造秒级倒计时压力。

**救援入口:** `待救 ×{rescueCount}`;气泡:`有 {rescueCount} 只小鸡等你接回家`
(=0 态显示方式见 V-7,未裁决)。

**鸡蛋与厨房:**余量 `鸡蛋 {eggStock}`；孵化空闲时 `放一颗蛋进去`，占用时 `小鸡宝宝正在长大`。厨房分别显示 `单份煎蛋 · 1`、`野餐餐盘 · 5`、`庆典大餐 · 20`；旧单锅单份流程仅作动画素材参考，不再原样保留。

**阶段 C VM 校正(2026-07-17):**学习流的 `session.doneCount` 统计复习题 + 新词见面 + 新词自测步骤，
不能直接同时驱动“今日单词”和候选 B 的朋友进度。VM 因此把 `learnedToday` 解释为已完成的
复习词 + 已完成见面/自测的新词，新增 `newWordsLearnedToday` 驱动顶栏；`totalItemsToday`
为复习词 + 新词数量。预计分钟与蛋奖励仍使用领域层的真实步骤数，规则不变。

---

**下一步**:阶段 A/B/C/D/E/F 工程实现均已完成；阶段 G 的无密钥 PWA 工程项已完成，
等待 A2759 standalone 真机验收。之后进入完整学习主流程、手写游戏、救援与家长页生产视觉。
V-3 正式位图视觉锁定、V-4 多气泡行为、V-5 40+ 密度继续按变更单推进；
A2759 TTS 实际发声在真机验收时抽听。
