# 皮皮のEnglish

给皮皮的每日背单词 PWA。所有产品、视觉、资产与 AI 协作文档统一收纳在 [文档中心](docs/README.md)；开始任务先读 [AI_START_HERE.md](docs/00-start/AI_START_HERE.md)。

## 本地开发

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 类型检查 + 生产构建(输出到 dist/)
npm run preview  # 本地预览生产构建
```

## 部署（2026-07-17 定稿：GitHub Pages）

- 推送到 `main` → GitHub Actions 自动测试、构建并发布到 GitHub Pages
  （工作流见 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)，
  CI 构建以 `GITHUB_PAGES=true` 启用 `/pipienglish/` 子路径 base）。
- **安装**：iPad Pro 的 Safari 打开站点 → 分享按钮 → **添加到主屏幕**。
- **备份**：家长页手动导出 JSON 兜底；云备份自动推送到本仓库 `backups` 分支
  （打开 App 时距上次备份 >24h 且有网即触发；访问令牌只存设备本地，
  详见 [SPEC §6](docs/01-product/SPEC.md)）。Safari 可能清除长期不用的
  站点数据，学习记录不能只存在设备里。

## 技术栈

Vite + React + TypeScript · Dexie (IndexedDB) · ts-fsrs (间隔重复) · vite-plugin-pwa (离线)

## 核心参数（改之前先读产品规格第 0 节）

| 参数 | 值 | 位置 |
|---|---|---|
| 每日新词(硬上限) | 4 | `src/session.ts` `NEW_PER_DAY` |
| 每日复习上限 | 25 | `src/session.ts` `REVIEW_CAP` |
| FSRS 目标保留率 | 0.9 | `src/srs.ts` |
| 词库 | 「好吃的!」88 词 | `src/data/words.ts` |

## 已实现(v0.1)

每日任务流(复习 → 新词 → 立即自测,答错当场重考)· FSRS 调度 · 复习债上限+自动顺延 ·
母鸡进度条+下蛋 · 次日孵化小鸡农场 · 屁股超人完成动画 · TTS 发音 · 离线 PWA · 数据导出/导入

## 当前视觉状态

F4 首页样板与视觉语言已经由小皮确认并锁定；正式 React/PWA 仍需按固定 1194×834 舞台接入，不能把“样板已确认”误写成“生产页面已经完成”。当前唯一视觉入口是 [F4 视觉系统](docs/02-visual/F4_VISUAL_SYSTEM.md)。

## 路线图

见 [SPEC.md](docs/01-product/SPEC.md) 第 8 节：图鉴、里程碑进化、补签卡、喂煎蛋、考妈妈模式、「刀与妖怪」词包、云同步。
