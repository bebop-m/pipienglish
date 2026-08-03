---
change_id: F4-CHG-031
date: 2026-08-03
stage: farm-home-interaction
affected_state:
  - scene_element_homes
production_behavior_change: implemented
approval: dad-reported-bug
independent_review: not-required
release_gate: domain-and-usecase-tests-passed
source_of_truth: docs/00-start/CURRENT_TASK.md
supersedes: none
---

# 可拖动物件不再被每日任务卡片吞掉

小皮把错题鸡窝（待救援小鸡框）拖到每日任务背景板后面，之后再也拉不回来。核实为硬锁，本变更在领域层加落点保留区修复。

## 根因

首页舞台里，卡片压在所有可拖动物件之上：

| 元素 | 选择器 | z-index |
|---|---|---:|
| 每日任务卡片 | `.task-board-f3` | 65 |
| 完成庆祝卡片 | `.complete-board-f4` | 65 |
| 错题救援框 | `.rescue-wrap-f4` | 58 |
| 孵化小屋 | `.hatchery-wrap-f4` | 56 |
| 小皮 / 母鸡 | `.actor-f3` | 20 |

而 `clampSceneElementHome` 只把落点钳进舞台安全区（救援框 `x≥12`、`y≥180`），卡片矩形（实测 `28,92,370×247`）完全落在允许范围内。物件停到卡片背后后，卡片不透明且在上层，指针事件全部被卡片接走 —— 浏览器实测该位置 `document.elementFromPoint` 命中的是卡片里的 `k-button`，不是救援框。孩子没有任何自救手段。

角色（小皮/母鸡）本来就有 `FarmActors.tsx` 的 `positionIsBlocked` + `lastValid` 兜底，所以只有孵化小屋和救援框会真的被吞；但持久化层没有同等保护，坏坐标仍能写进 KV。

## 裁决

不调 z-index，不改任何已批准视觉。卡片是 UI，物件是场景元素，卡片压在上面是对的；要修的是**落点允许出现在卡片背后**。

在 `farmLayout.ts` 增加卡片保留区常量：

```
DAILY_BOARD_KEEPOUT = { left: 24, top: 88, right: 418, bottom: 436 }
```

取值为两张会与物件同时在屏的卡片实测外框的并集加安全边：`.task-board-f3`（28,92,370×247）与 `.complete-board-f4`（31,91,382×338）。`.name-board-f4` 只在 `first_visit` 出现，那时物件不渲染，不计入。

## 两段式落点

| 阶段 | 函数 | 行为 |
|---|---|---|
| 拖动过程 | `clampSceneElementHome` | 只钳舞台安全区，**完全跟手**，可以从卡片上划过 |
| 松手 / 持久化 / 备份恢复 | `resolveSceneElementHome` | 钳安全区后再推出保留区 |

推出规则：取左、右、上、下四个逃逸候选，各自再钳回安全区，丢掉仍然压卡片的，剩下的按与原落点的距离取最近；四个方向都出不去时回该元素的 `defaultHome`。四类物件的默认位置均已在测试中断言落在保留区之外。

接入点：

- `StageDraggable.finishDrag`：松手时归位并立即渲染归位后的坐标，所见即所得；
- `placeSceneElement`：写入 KV 前归位；
- `normalizeSceneElementHomes`：**读取时归位**，因此已经存到卡片背后的旧存档下一次加载就自动救回，不需要用户操作，也不需要数据迁移。

## 存量存档影响

已被吞掉的坐标在下一次 `loadViewModel` 读取时即被推出保留区，KV 原值保留但不再被使用（每次读取幂等归位）。备份导入路径共用同一个 normalize，旧备份重放同样安全。无数据库迁移。

## 验证

- `farmLayout.test.ts` 新增 4 个用例：默认位置全部在保留区外、四类物件从卡片各处落下都会被推出且结果仍在安全区内、旧存档坐标读取时被修复、拖动过程钳制仍然跟手。
- `farmHome.test.ts` 新增用例：落点压卡片时写入 KV 的是推出后的坐标；直接写坏 KV 后 `loadViewModel` 自动修复。
- L2 legacy fixtures：`backup.test.ts` / `migration.test.ts` / `farmPersistence.test.ts` 通过。
- 完整测试 47 文件 264/264 通过（基线 259），`tsc --noEmit` 无错误，全屏视觉层守卫通过。
- 真实浏览器（1194×834 舞台）实测：写入被吞坐标 `rescue{60,190}` / `hatchery{12,200}` 后刷新，分别归位到 `{60,436}` / `{12,436}`，救援框中心点 `elementFromPoint` 命中自身；模拟指针把救援框拖到卡片正中松手，落点为卡片正下方 `{142,436}`，仍可点击。

## 未纳入本次变更

- `FarmActors.tsx` 的 `positionIsBlocked` 与本保留区功能重叠但不冲突（一个按 DOM 实测挡在拖动中，一个按常量兜在落点），本轮不合并两套逻辑。
- 保留区是常量，与 `home.css` 的卡片几何存在漂移风险；卡片尺寸如有调整需同步该常量。目前没有自动校验，属已知取舍。
