# Claude × Codex 协作契约（F4 之后）

## 1. 目标

Claude 负责把产品内部架构规划清楚，Codex 负责把小皮确认的 F4 视觉准确落地。两边通过稳定的数据和状态契约协作，不互相猜测，也不让架构重构顺带改掉视觉。

## 2. 单一事实源

- AI 统一入口和开场提示：[`../00-start/AI_START_HERE.md`](../00-start/AI_START_HERE.md)。
- 产品规则、学习流程和数据模型：[`../01-product/SPEC.md`](../01-product/SPEC.md)。
- 视觉方向和页面设计要求：[`../01-product/DESIGN_BRIEF.md`](../01-product/DESIGN_BRIEF.md)。
- F4 精确画风与资产生成：[`../02-visual/F4_VISUAL_SYSTEM.md`](../02-visual/F4_VISUAL_SYSTEM.md)。
- iPad 保真与验收：[`../02-visual/F4_IPAD_FIDELITY.md`](../02-visual/F4_IPAD_FIDELITY.md)。
- 不可变文件与哈希：[`../02-visual/F4_BASELINE_MANIFEST.md`](../02-visual/F4_BASELINE_MANIFEST.md)。
- 待制作独立图片：[`../04-assets/ASSET_BACKLOG_F4.md`](../04-assets/ASSET_BACKLOG_F4.md)。
- 小皮确认的原始参考和 PWA 图标母图：[`../reference-images/README.md`](../reference-images/README.md)。

Claude 和 Codex 开始工作前都必须读取以上与任务有关的文档。任何旧提示词与这些文档冲突时，以文档优先级为准。

## 3. 职责边界

| 范围 | Claude（架构） | Codex（视觉落地） |
|---|---|---|
| 数据模型、FSRS、持久化、备份 | 负责 | 只消费稳定接口 |
| 路由、功能边界、服务层、错误状态 | 负责 | 可提出视觉状态缺口 |
| 页面状态机和事件命名 | 主责，与 Codex确认 UI 所需状态 | 校验状态是否足以呈现设计 |
| F4 画风、Token、布局、资产与动效 | 不修改、不替换 | 负责 |
| iPad 固定舞台、拖拽和视觉响应策略 | 提供技术约束 | 负责实现和视觉验收 |
| 可访问性、性能、离线 PWA | 共同负责 | 共同负责 |
| 小皮视觉确认 | 不代替 | 整理候选与对照，结论由小皮/爸爸给出 |

## 4. Claude 的交付格式

Claude 的架构方案必须输出以下内容，避免先造一套带样式的页面再让视觉层返工：

1. 页面/功能模块边界；
2. TypeScript 数据类型；
3. 每屏状态枚举和状态迁移；
4. 视觉层要消费的只读 ViewModel；
5. 用户事件及副作用；
6. IndexedDB 字段与迁移；
7. 离线、失败、空数据和恢复状态；
8. 不含视觉主张的语义组件骨架或接口。

示例：

```ts
type FarmHomeState = "first_visit" | "daily_incomplete" | "daily_complete";

interface FarmHomeViewModel {
  state: FarmHomeState;
  day: number;
  learnedToday: number;
  dailyTarget: number;
  eggStock: number;
  incubatingEggs: IncubatingEggViewModel[];
  chicks: FarmChickViewModel[];
  rescueCount: number;
  motionEnabled: boolean;
}

type FarmHomeEvent =
  | { type: "START_DAILY_LESSON" }
  | { type: "OPEN_HANDWRITING_GAME" }
  | { type: "ALLOCATE_EGG"; use: "hatch" | "cook" }
  | { type: "MOVE_CHICK"; chickId: string; x: number; y: number }
  | { type: "OPEN_RESCUE" }
  | { type: "SET_MOTION"; enabled: boolean };
```

其中 `x/y` 是 1194×834 逻辑坐标，不是设备像素。

## 5. Claude 不得做的事

- 不得把 F4 图片替换成字符图标、通用矢量图、CSS 几何图形或另一套 AI 图片。
- 不得为了组件库统一，把 F4 纸牌、按钮、圆角、颜色、字体或阴影替换成默认 Design System。
- 不得让首页改成通用 Dashboard、卡片网格或居中大弹窗。
- 不得擅自做“更现代”“更简洁”“更响应式”的视觉重排。
- 不得修改 `docs/02-visual/F4_BASELINE_MANIFEST.md` 中锁定的母版文件。
- 架构需要新视觉状态时，先提交状态与用途，不自行填补最终美术。

开发期确需占位时，只能使用带明显 `DEV PLACEHOLDER` 标记的中性方块，并保证不会进入面向小皮的构建或截图。

## 6. Codex 的交付格式

每个视觉任务至少交付：

1. 使用的母版文件和资产版本；
2. 对应页面状态和事件；
3. HTML/React 结构、CSS Token、图片和动效；
4. 1194×834 黄金截图；
5. iPad 11/13 英寸适配截图；
6. 与母版的差异说明；
7. 自动测试和真机待验项目。

若需要新独立图片，先按 `docs/02-visual/F4_VISUAL_SYSTEM.md` 的结构化需求单制作和验收，再接入页面。不得用 CSS 临时拼图冒充最终资产。

## 7. 共享组件边界

推荐拆分：

```text
domain/                 学习、鸡蛋、孵化、救援规则；无视觉代码
application/            用例、状态机、持久化协调
features/farm-f4/       F4 首页视图、交互、动效和逻辑坐标适配
components/learning/    学习卡语义与 F4 视觉实现
styles/f4/              Token、固定舞台、组件样式
public/assets/f4/       经批准的本地位图资产
visual-regression/      黄金截图、视口矩阵和差异报告
```

领域层不得依赖图片路径或 CSS 类名；视觉层不得直接写 Dexie 或 FSRS 规则。

## 8. 变更流程

任何影响小皮已确认画面的修改都提交一张变更单：

```yaml
change_id: F4-CHG-001
reason: 为什么必须改
affected_state: daily_incomplete
affected_files: []
visual_before: 基准截图路径
visual_after: 候选截图路径
behavior_change: none | 描述
asset_change: none | 描述及新哈希
approval: pending | dad-approved | xiaopi-approved
```

- `pending` 版本不得覆盖母版。
- 仅修 bug 也要确认它是否改变像素输出；改变则保留前后截图。
- 新功能优先作为新状态或新独立物件叠加，不重绘整张首页。
- 小皮确认形成新的视觉基准时，使用 F5 或资产新版本号并更新清单，不回写历史。

## 9. 每屏完成顺序

1. Claude 定义状态、数据和事件接口。
2. Codex 用真实 F4 资产完成 1194×834 视觉实现。
3. 自动检查状态、交互、断网和截图差异。
4. iPad Pro 真机/PWA 检查。
5. 小皮确认视觉；爸爸确认产品逻辑。
6. 锁定该屏截图、资产版本和接口，再进入下一屏。

## 10. 合并门槛

- 架构测试通过，但没有视觉回归：不能视为页面完成。
- 视觉截图一致，但状态使用硬编码假数据：只能视为视觉样板。
- 真实状态、真实资产、iPad 固定舞台、离线缓存和截图回归全部通过，才是可交付页面。
