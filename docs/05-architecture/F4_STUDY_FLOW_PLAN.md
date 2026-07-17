# F4 学习流·救援·写词游戏 · 内部架构与实施方案 v4

> 作者:Claude(架构),2026-07-17。依据 `docs/03-workflow/CLAUDE_CODEX_VISUAL_CONTRACT.md` §4 交付格式。
> **v4 = 写词游戏生产版**:在 v3(救援闭环)基础上,按爸爸指令开放手写练习模式(SPEC §2.4 写词游戏):
> 每轮 ≤10 题、复用 H-5 默写卡、陈旧度加权抽词、不写 FSRS、完成得煎蛋。
> 归约语义按阶段 H 定稿(原地重试、文本默写判定、母鸡妈妈竖拇指结束页)修订。
> 旧 v1 中的队尾重考、手写自评、字迹保存与屁股超人结束页方案均已按裁决作废,不得回流。

## 0. 任务四问(AI_START_HERE 要求)

1. **修改哪一层**:domain(煎蛋奖励规则)/application(游戏用例)/游戏容器/生产路由与文档;
   H-5 默写卡零改动,仅通过 Codex 已提供的 headerTitle/progressText/stepChip 可选 props 换头部文案。
2. **直接参考且不可修改**:`F4_BASELINE_MANIFEST.md` 登记母版与 Stage H 既有基准截图。
3. **逻辑尺寸**:1194×834(学习各屏同属固定舞台)。
4. **未破坏 F4 的证明**:119/119 测试绿 + `tsc` 无错 + 生产 PWA 构建通过 + 1194×834 走查:
   完成态木牌 → 写词游戏一轮(答对/原地重试/想不起来被抓)→ 煎蛋就位 → 喂食消耗,控制台无错误。
   (嵌入式浏览器面板会节流 Web Animations,飞蛋动画在该环境需手动 finish;真机/普通浏览器不受影响,阶段 D 已验证。)

## 1. 模块边界

```text
src/
  domain/
    words/                  # L1 词库(14 主题包,556 词)+ 质检 + v0.1 ID 快照;egg 已挂批准插图 egg-f4-v2
    lesson.ts               # ★ 学习流规则:计划构建 + 事件归约(纯函数,可 JSON 序列化)
    dailyPlan.ts            # 今日取词(复习≤6/新词4)+ 积压自动暂停新词(SPEC §5.1)
  application/
    usecases/lesson.ts      # ★ 学习流用例:断点恢复 / 事件执行 / 完课结算注入
    usecases/rescue.ts      # ★ 救援 FIFO / 阶段断点 / 最终 seen 原子事务
    usecases/handwriting.ts # ★ 写词游戏:解锁门槛 / 陈旧度抽题 / seen 更新 / 煎蛋奖励(不写 FSRS)
    lessonViewModel.ts      # ★ 只读 VM:步骤数据 + 选项(稳定 id,不泄英文)+ 同类序号
  features/lesson-f4/
    useLesson.ts            # ★ 视觉桥(useFarmHome 同款):VM 订阅 + answer/forgot/stepDone/next
    LessonFlowScreen.tsx    # ★ 容器:按步骤类型分发到 H-1~H-6 批准组件,无视觉主张
    Lesson*Screen.tsx       # H-1~H-6 生产组件(Codex,已批准,整流零改动)
  features/rescue-f4/       # 救援桥 + 四张学习卡复用容器
  features/handwriting-f4/  # 写词游戏桥 + H-5 默写卡复用容器
  App.tsx                   # 生产路由 farm ↔ lesson/rescue/handwriting;家长页继续门控
```

边界铁律不变:视觉组件只消费 `useLesson`/`lessonViewModel` 类型,不直接触碰 Dexie/FSRS。

## 2. 领域模型(与代码一致)

```ts
type LessonStepType = 'intro' | 'trace' | 'choice' | 'listening' | 'dictation' | 'closing'
// intro=听看卡(H-1) trace=描红卡(H-2) choice=选择题(H-3) listening=听音题(H-4)
// dictation=默写题(H-5,入 FSRS) closing=收尾默写(复用 H-5 卡,不入 FSRS 不计分)

interface LessonStep {
  stepId: string; type: LessonStepType; phase: 'review' | 'new' | 'closing'
  wordId: string
  scored: boolean      // 首次作答写 FSRS(closing 恒 false)
  attempted: boolean   // 已答错过(原地重试中):Again 已定调,后续不再写入
  options?: string[]   // choice/listening 中文释义 ×4,计划期生成,断点恢复不变
}
```

### 2.1 计划构建(`buildLessonPlan`,不变)

复习题型分配(stability≥7 默写、日限 3 超额降级、选择/听音按 lastQuizType 交替)、
热身前 3 张、其余种子乱序、新词三步、收尾默写 ×N、干扰项同包同级优先 —— 同 v1。

### 2.2 归约规则(阶段 H 定稿:答错原地重试)

| 当前步 | 事件 | FSRS | 前进 | 音频(SPEC §2.6) | 其他 |
|---|---|---|---|---|---|
| intro | STEP_DONE | — | ✓ | 进场 ×2 归组件 | doneCount+1 |
| trace | STEP_DONE | — | ✓ | 播 1(书写完成) | — |
| choice/listening/dictation | ANSWER 对 | 首答→Good | ✓ | 播 1 | doneCount+1* |
| choice/listening/dictation | ANSWER 错 | 首答→Again | ✗ 留在本题 | — | attempted=true |
| dictation/closing | FORGOT(想不起来) | 首答→Again(closing 除外) | ✓ 跳过 | — | 进救援(H-5D 小鸡被抓);doneCount+1* |
| closing | ANSWER 对/错 | 不写 | 对✓/错✗ | 对→播 1 | 不入 answered 统计 |

\* doneCount 口径 = 复习×1 + 新词(intro+choice)×2,与首页 VM 和蛋奖励阈值(14 项→2 颗)兼容,首页零改动。
FSRS **每词每日只评一次**:首次作答定调,重试答对不覆盖 Again(不污染排程)。
选择/听音无"想不起来"按钮(H-3/H-4 批准态);默写判定为标准英文文本客观比较(F4-CHG-012),
判定在组件内完成,归约只收 `correct`。事件与当前步不匹配一律忽略(防双击/迟到)。
队列清空 → `COMPLETED` → 注入的 `completeDailyLesson`(发蛋+连胜,幂等)。

### 2.3 新词自动暂停(SPEC §5.1,不变)

连续 3 天到期 >12 → 今日新词暂停(最多连停 2 天)；`newWordsPaused` 进入首页 VM。
暂停日任务板主标题为 `连续 {streak} 天！`，正文为 `今天复习 {reviewCountToday} 个老朋友。`，进度与开始按钮照常保留。

### 2.4 写词游戏(SPEC §2.4,v4 新增)

- **解锁**:今日必修完成(首页完成态木牌是入口,`unlockedToday` 是数据侧防线);**不限轮数**,
  每次从木牌进入即新一轮;任何界面都没有"再来一组新词"的入口(新词 4 个硬上限不变)。
- **抽题**:已学词(有 FSRS 卡且仍在词库)按陈旧度 `P ∝ (天数+1)²` 不放回抽 ≤10 题;
  词不足 10 时整池出题(前几天也能玩)。轮次为一次性随机(不做断点,退出即弃,重进新一轮)。
- **答题**:全部复用 H-5 默写卡(文本客观判定,原地重试);头部经可选 props 换文案
  (`写词游戏 · 第 x 题 / N`、`写完 N 题得一颗煎蛋`、`写一写 · 写词游戏`),卡片视觉零改动。
- **数据铁律**:结果**不写 FSRS**(自评+无限次游玩会污染排程),写对只更新 `seen`;
  "想不起来"照常进救援(小鸡被抓)+ 更新 `seen`;答错无副作用。
- **奖励(蛋经济新规则 `awardFriedEgg`)**:完成一轮得 1 颗煎蛋;煎蛋**只能喂食、不能孵化**
  (绝不进 eggStock,孵化蛋只来自每日必修,守住"小鸡数 ≈ 累计学习天数");
  锅空 → 直接就位 `ready`,锅忙 → 记入 `farmState.pendingFriedEggs`(新可选字段,免迁移),
  `feedDone` 喂完当前煎蛋后自动补锅 —— 奖励永不丢失(永不惩罚)。喂食走首页既有流程。

## 3. 页面状态机与路由

```text
农场(daily_incomplete)─ 开始学习!─▶ LessonFlowScreen
   ▲                                   │ 按 vm.current.type 分发 H-1~H-5 卡片
   │ 回农场(头部返回,断点已逐步落库)   │ 每步 dispatch 落库,崩溃/退出即断点
   │                                   ▼ 队列清空(COMPLETED 已结算发蛋+连胜)
   └── 回农场 ◀── H-6 结束页:母鸡妈妈竖拇指"真棒!"+ 真实战报(新词/复习/连胜/蛋 +N)
```

- 组件自管答对/重试/被抓画面;桥只在 `stepDone/next` 后刷新 VM,`answer/forgot` 不刷新
  (避免答对态还没点"继续"就切卡)。
- `farm → rescue` 已按爸爸裁决开放：救援按 `capturedAt` FIFO，依次复用听看、描红、选择、默写卡。
- `farm → handwriting` 已按爸爸指令开放(v4):完成态木牌 → 一轮 ≤10 张默写卡 → 发煎蛋 → 自动回农场喂食;家长页继续门控。
- 跨日打开学习页:`useLesson.refresh` 先跑 `clockGuard`,日期变更自动重建会话与计划。

## 4. 视觉层消费的只读 ViewModel(`application/lessonViewModel.ts`)

```ts
interface LessonViewModel {
  hydrated: boolean; date: string
  doneSteps: number; totalSteps: number   // 今日进度(按步);原地重试不改变分母,母鸡只前进
  current: LessonStepVM | null
  finished: boolean
  newWordsPaused: boolean
  summary: { newWords; reviews; answered; correctRate; forgotten }
}
interface LessonStepVM {
  stepId; type; phase
  word: { id; word; ipa; meaning; sentence; sentenceCn; emoji; imageAssetId? } // emoji 仅开发壳
  options?: { id: string; label: string }[]  // id=opt-N,不携带英文(H-3/H-4 防泄题)
  correctOptionId?: string
  stepOrdinal: number; stepOrdinalTotal: number // 新词三步 1..3;复习/收尾按同类型第 x 题/共 N 题
}
// H-6 战报由桥组装(useLesson.LessonFinishVM):课程侧 newWords/reviews + 农场侧 dayNumber/streak/eggsEarned
```

## 5. 用户事件及副作用

```ts
type LessonEvent =
  | { type: 'STEP_DONE' }                // H-1"我认识它了" / H-2"写好了"
  | { type: 'ANSWER'; correct: boolean } // H-3/H-4 选项判定、H-5 文本判定(组件客观判分)
  | { type: 'FORGOT' }                   // H-5"想不起来"(dictation/closing)
```

副作用全部在 `dispatch` 事务内:FSRS 评分(含 lastQuizType)、seen 见面时间、救援入队、
session 计数、断点落库;事务外:答对/书写完成自动发音(注入 speak)、完课发蛋连胜(幂等)。
组件自管的音频:听看卡进场 ×2 与 500ms 词形延迟、听音题进场 ×1、各重听按钮。
字迹不留档(F4-CHG-012)；“偷看一眼”类交互不存在，救援默写也不揭示答案。

## 6. IndexedDB 字段与迁移

无 Dexie 版本升级：`cards.lastQuizType?`、`sessions.dueBacklog?/newWordsPaused?`、
`rescue.stage?` 均为非索引可选字段；旧救援记录缺失 `stage` 时从 `intro` 开始。
学习断点仍为 `kv['lesson:{dayKey}']`(隔天自动清理)，救援断点直接保存在对应 `rescue` 行。
`ink` 表保留但当前不写入(F4-CHG-012 取消字迹保存;v0.3 图鉴再议)。
备份 `exportAll` 全表兼容,格式号不变。

## 7. 离线、失败、空数据与恢复

1. **断点恢复**:每 dispatch 落库;浏览器走查验证"描红中刷新 → 重进直达描红卡"。
2. **日期翻转**:kv 键含日期,不符即弃旧建新;clockGuard 保障会话存在。
3. **TTS 不可用/迟到/连点**:服务层无声降级(11 测试),音频失败不影响判分与进度。
4. **双击/迟到事件**:归约白名单过滤,幂等。
5. **空数据**:词库耗尽且无复习 → 空计划即 finished(不发 COMPLETED,不白拿蛋);
   新词暂停日只有复习流。
6. **重复完课保护**:completeDailyLesson 以 session.completed 幂等;结束页"回农场"防重复点击。

## 8. 语义组件骨架(已落地)

```tsx
// App.tsx:farm ↔ lesson 路由;FarmHomeScreen 通过 onNavigate 上抛导航意图
// LessonFlowScreen:switch(step.type) → H-1~H-5 批准组件;finished → H-6 结束页
//   (H-6 = LessonFinishScreen:母鸡妈妈竖拇指"真棒!"+ 战报 + 回农场;屁股超人方案已永久废弃)
// useLesson:vm/finish + answer/forgot/stepDone/next(见 §3 刷新时机)
```

## 9. 测试边界(119/119 绿)

| 层 | 文件 | 覆盖 |
|---|---|---|
| domain | `lesson.test.ts`(15) | 题型分配/热身/确定性/选项/原地重试(首错 Again 定调、重试不覆盖)/想不起来/收尾/完成/序列化 |
| domain | `dailyPlan.test.ts`(6) | 取词上限/积压暂停/连停恢复 |
| domain | `words.test.ts`(7) | 质检门禁/88 个 v0.1 ID 映射/规模/干扰项池 |
| application | `lesson.test.ts`(7) | 首日全链路→发蛋连胜/断点恢复/原地重试+FSRS/救援/次日计划/VM 选项与序号 |
| domain/application | `rescue.test.ts`(5) | 旧记录兼容/FIFO/确定性选项/阶段断点/错答不前进/最终原子删除/多词连续/幂等与副作用隔离 |
| domain | `eggEconomy.test.ts`(+3) | 煎蛋奖励:锅空就位/锅忙挂起/喂完自动补锅;eggStock 永不变 |
| application | `handwriting.test.ts`(6) | 解锁门槛/只抽已学不放回/陈旧度优先/写对不动 FSRS/想不起来进救援/奖励事务 |
| application | `services/tts.test.ts`(16) | 不可用/声音迟到/连播取消/×2 续播 |
| features | `lesson*Model.test.ts`(Codex) | 各卡纯函数判定模型 |
| 浏览器 | 1194×834 全流程走查 | 普通学习流无回归；待救×1→听/描/选/写→待救×0；错答重试、最终继续原子完成、暂停任务板、SW 断网冷启动；控制台无错误 |

## 10. ⚠️ 待视觉/产品确认(不自行决定)

| # | 事项 | 说明 | 裁决人 |
|---|---|---|---|
| S-1 | 单词插图(P1 资产) | **延期**；已有 egg 保留，其余词与救援听看卡使用正式无图版 | 爸爸已裁决 |
| S-3 | 新词暂停日文案 | **已投产**；显示真实连胜天数和今日复习数，保留进度与开始按钮 | 爸爸已裁决，直接生产 |
| S-7 | 复习步骤的头部人设 | **保持现状**；复习词继续沿用组件默认头部，不新增“老朋友”版本 | 爸爸已裁决 |
| S-8 | 救援屏 | **已投产**；听看/描红/选择/默写四段，FIFO、阶段恢复、最终原子移出并更新 seen | 爸爸已裁决，直接生产 |
| S-9 | 写词游戏结算/喂食屏(V-6) | 当前完成一轮后**静默发煎蛋并回农场**,喂食走首页既有随机流程;SPEC §8.5 的游戏内"奖励结算 + 选小鸡喂食"专属画面与 V-6"选择小鸡"未做,需要 Codex 视觉候选后再接 | 爸爸排期 |
| S-10 | 锅自动补挂起煎蛋的表现 | 多轮奖励下喂完一颗锅立即再现 ready 煎蛋(数据行为),视觉是否需要"又蹦出一颗"的过渡表现 | Codex 视情况出案 |

(v1 的 S-2 重考卡文案、S-4 进度条、S-5 收尾氛围、S-6 词形延迟已由阶段 H 批准稿解决。本轮按爸爸裁决直接上线，不再设置小皮逐屏审核门槛。)

---

**下一步**:Codex 视觉复查(1194×834 生产截图对照)→ A2759 真机验收(断网冷启动 + PWA)→ 上线。
