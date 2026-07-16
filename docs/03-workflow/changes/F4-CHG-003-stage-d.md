# F4-CHG-003 — 阶段 D 蛋经济闭环

```yaml
change_id: F4-CHG-003
date: 2026-07-17
scope: egg-economy-two-day-loop
source_visual: design-samples/sticker-f-farm-v4.html
master_files_modified: false
deployment_performed: false
```

## 落地内容

- `daily_incomplete` 的鸡蛋面板接入真实 Dexie 数据：学习完成发蛋、分配到孵化位或平底锅、煎熟后喂给真实小鸡。
- 煎蛋到达小鸡后才提交 `FEED_CHICK`；飞行动画过程中锅内状态仍为 `ready`，刷新或动画中断不会凭空消耗煎蛋。
- 没有小鸡时禁止喂食，煎蛋继续留在锅里，界面明确提示等待第一只小鸡破壳。
- 喂食目标从当前可见小鸡中选取，动画终点使用真实小鸡 DOM 坐标；到达后提供短促庆祝反馈。
- `prefers-reduced-motion` 开启时将飞行动画缩短为淡出，不影响状态提交顺序。

## 并发结算修复

浏览器验收发现 React 开发模式可能同时触发两次 `clockGuard`。旧实现先在事务外读取农场状态，两次守卫可能同时认领同一颗到期蛋，导致一颗蛋生成两只小鸡。

现在读取农场、结算到期蛋、批量写入小鸡和保存农场状态全部位于同一个 Dexie 读写事务中。并发测试确认同一颗到期蛋只会结算一次。

## 内部走查入口

- 开发壳新增“回到未完成首页（保留资产）”，用于在不伪造资产的情况下回到正式 F4 首页。
- 开发壳新增“推进孵化 24 小时”，只调整真实孵化记录的时间戳，再由正式 `clockGuard` 结算。
- 两个入口均受 `import.meta.env.DEV` 限制，不进入生产构建，也不面向小皮。

## 验证

- Vitest：33/33 通过，覆盖无小鸡拒绝喂食、两日完整循环和并发时钟守卫。
- `npm run build`：TypeScript、Vite 与 PWA 生产构建通过。
- 1194×834 iPad 舞台浏览器走查：发蛋、下锅、煎熟、无小鸡保护、次日破壳、飞向真实小鸡、到达后清锅全部通过。
- 全新 IndexedDB 来源中，一颗到期蛋最终只生成一只小鸡。
- 浏览器 console：0 error / 0 warning。
- `design-samples/sticker-f-farm-v4.{html,css,js}` 母版未修改。

## 当前边界

阶段 D 的领域、数据库与首页交互闭环已经完成。学习页与 `daily_complete` 的孩子可见正式视觉仍属于后续屏幕阶段；本次通过内部开发壳驱动真实数据库完成两日走查，不把开发入口视为上线功能。
