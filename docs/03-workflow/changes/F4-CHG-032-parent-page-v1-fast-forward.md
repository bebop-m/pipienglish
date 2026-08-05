---
change_id: F4-CHG-032
date: 2026-08-05
stage: parent-page
affected_state:
  - cards
  - sessions
  - kv(meta/farmState/starterWordsSeeded/parentLastExportAt)
  - chicks
  - seen
production_behavior_change: implemented
approval: dad-decision-2026-08-05
independent_review: not-required
release_gate: full-suite-and-browser-verified
source_of_truth: docs/00-start/CURRENT_TASK.md
supersedes: none
---

# 家长页 v1:备份通道 + 换机快进

小皮的 iPad Pro 送修,临时改用 iPad mini。数据只存本地 IndexedDB(SPEC §6 数据安全裁决),而生产构建此前没有任何导出/导入入口(逻辑在 `backup.ts` 但 UI 只在 DevShell,被 `import.meta.env.DEV` 门控)。爸爸裁决落地家长页 v1,并新增「快进到 Day N」让 mini 直接接上进度、习惯不断档。

## 范围

| 功能 | 说明 |
|---|---|
| 入口门控 | 首页「家长」按钮(已存在)导航生效;两位数乘法算术题防小皮误入,答错换题 |
| 导出/导入 | 复用 `exportAll`/`importAll`(v3 存档,兼容 v1/v2)。导出优先 Web Share(iPad 可 AirDrop/存文件),回退下载;记录上次导出时间,≥7 天未导出标黄提醒(SPEC §6「定期导出提醒」) |
| 连胜日历 | meta 统计行 + 最近 8 周完成日历(✓=当日必修完成) |
| 改蛋数 | 直接改 `farmState.eggStock`(0–9999 整数);孵化棚中的蛋不受影响 |
| 快进到 Day N | 见下 |

## 快进语义

在本机**整档重建**(与备份导入同一清库-重建路径):模拟「昨天结束的连续 N 天,每天按计划全部完成、全部答对」。

- 起步词 12 个在模拟 Day 1 播种(与 `clockGuard` 顺序一致),`starterWordsSeeded` 标记带上,不会重播;
- 每天用真实的 `buildPlan`(词库固定投放顺序 ×4 + 到期复习 ≤6)与真实 FSRS(`rate`,全对 → Good)按当天 19:00 重放;§5.1 积压暂停规则同样如实触发 —— **全对节奏下每天只消化 6 张复习、新增 4 张,积压会周期性暂停新词,N 天的实际新词数少于 4N 属规则本身行为,真机同样如此**;
- 连胜/累计/lastDoneDate/installDate 按输入与日期写入(连胜超过 N 截断);
- 蛋库存、小鸡数不可推导,由爸爸照旧设备实况填;小鸡出生日铺在最近几天;
- 本机 settings(动效/音乐)保留;描红笔迹、救援队列、贴纸装扮、章节进度不恢复(旧设备独有,快进不伪造)。

已知取舍(爸爸知情同意):快进后 mini 与 Pro 存档分叉,导入为整档覆盖、无合并;Pro 修回后其存档只作导出留档,不再导回;她真实答错过的词在模拟里按全对排程,复习节奏几天内自行纠正。

## 实现

- `srs.ts`:`newCard`/`rate` 增加可选 `now` 参数(默认当前时间,向后兼容),供按过去日期建卡/打分;
- `application/fastForward.ts`:内存重放 + 单事务落库;输入校验独立导出(`validateFastForwardInput`);
- `features/parent/ParentScreen.tsx` + `parent.css`:朴素家长 UI,刻意不用 F4 视觉语言与资产,不碰任何小皮可见界面;
- `App.tsx`:放开 `parent` 路由(此前注释「继续门控」)。

## 验证

- `fastForward.test.ts` 5 用例:输入校验、N 天会话连续且新词与投放顺序一字不差、meta/农场/小鸡断言、快进后 `clockGuard` 建出 Day N+1 会话且起步词不重播、整档覆盖旧数据清空而本机设置保留。时钟钉死 2026-08-05,不随真实日期漂移。
- 全量 48 文件 269/269 通过(基线 264),`tsc --noEmit` 干净;L2 legacy backup fixtures(`backup.test.ts`/`migration.test.ts`)在全量中通过。
- 真实浏览器(1194×834)端到端:家长按钮 → 算术门控 → 快进(N=23/连胜23/鸡15/蛋9)→ reload 后首页 `花花/蛋7/鸡15/daily_incomplete`、IndexedDB `meta{streak:23,totalDays:23,installDate:2026-07-13}`、24 条会话、今日队列复习 6;连胜日历 23 个 ✓;改蛋数 7→9 生效;导出走回退下载并记录导出时间。console 无错误。
- iOS 真机(mini)上 Web Share 路径待爸爸实际导出时顺手验证;失败会自动回退下载,无阻塞风险。

## 未纳入本次变更

- 家长周报/统计图表维持 v0.4 路线不变;
- 补签卡(连胜修复)维持 v0.3 规则演进位置,家长页不提供改连胜入口(快进除外);
- 导入前自动备份当前档(防误覆盖)可在后续加,当前以两次确认弹窗兜底。
