# F4-CHG-002 · 阶段 C daily_incomplete 生产接入

```yaml
change_id: F4-CHG-002
date: 2026-07-17
scope: daily_incomplete
source_visual: design-samples/sticker-f-farm-v4.html
approved_copy: F4-CHG-001 / V-2 candidate B
master_files_modified: false
deployment_performed: false
```

## 落地内容

- `FarmHomeScreen` 只在 `daily_incomplete` 路由正式 F4 视觉；`first_visit` 与
  `daily_complete` 在阶段 F 前继续使用明确标记的内部开发壳。
- 顶栏、任务板、孵化棚、救援入口与鸡蛋面板全部消费 `FarmHomeViewModel`；正文、
  进度和按钮采用小皮批准的候选 B。
- 母鸡、农场主及当前可见小鸡使用 1194×834 逻辑坐标散步；运动可中断，拖拽使用
  Pointer Capture 并持久化逻辑落点；任务板、孵化棚与救援篮保留实体碰撞边界。
- 系统 `prefers-reduced-motion` 与页面动效开关都能停止自主运动；按压反馈即时。
- V-4 未裁决前，小鸡点击只呈现“单气泡 + 真实抽词”；没有写入假单词。
- V-1 剩余时间形式、V-7 零救援展示及 V-5 40+ 小鸡密度仍未自行裁决。

## 阶段 C 接口校正

浏览器验收发现原 VM 将学习步骤数同时用于“今日单词”和候选 B 的朋友进度：4 个新词
包含见面与自测两个步骤，会错误显示 `0 / 8`。现已拆分：

- `newWordsLearnedToday`：顶栏今日新词完成数；
- `learnedToday / totalItemsToday`：完成朋友数 /（复习词 + 新词）；
- 预计分钟与蛋奖励仍按复习 + 新词两步骤计算，领域规则未变。

## 验证

- Vitest：7 个文件，31/31 通过（新增 VM 进度语义测试）。
- `npm run build`：TypeScript + Vite + PWA 构建通过。
- 1194×834：候选 B 排版、面板、关闭、孵化气泡、动效开关通过。
- 1366×1024：舞台 `1366×954`，垂直居中 `top=35`，无内部重排。
- 834×1194：只显示“把 iPad 横过来吧”引导。
- 自主散步实时边界在舞台内；浏览器 console 0 error / 0 warning。
- `design-samples/sticker-f-farm-v4.{html,css,js}` SHA-256 复核，母版未修改。
