---
change_id: F4-CHG-006
date: 2026-07-17
stage: G
owner: Codex
target_device: iPad Pro 11-inch A2759 landscape standalone PWA
status: core complete; true-device and cloud-storage decision pending
---

# 阶段 G：PWA 收口与部署安全边界

## 本轮完成

- manifest 固定为 `standalone`、`landscape`，补齐相对 `id`、`start_url`、`scope` 和 `zh-CN`，保持 GitHub Pages `/pipienglish/` 子路径兼容。
- `apple-touch-icon` 改用 Vite `BASE_URL`，避免 Pages 子路径回退到域名根目录。
- 从锁定的 `pwa-icon-farm-master.png` 机械派生 180/192/512/maskable 图标；未使用 AI 重画，来源与输出 SHA-256 已登记。
- Workbox 预缓存覆盖构建产物、manifest、图标和全部 F4 PNG；背景大图所需单文件上限明确设为 3 MiB。
- 增加 iPad Safari 网页态的“添加到主屏幕”提示；Chrome/Firefox iOS、桌面环境和 standalone 启动均不显示，用户可关闭。
- 增加 `render_game_to_text` 测试观察接口，不改变生产交互。

## 验证

- PWA 安装环境判定：4 项单元测试通过。
- GitHub Pages 生产构建通过；预缓存清单含 20 个唯一条目、约 9.7 MiB，并逐项确认包含全部 F4 PNG。
- 1194×834 浏览器等效视口：提示条排版与关闭、减少动态切换、图片解码、console 0 error / 0 warning。
- 自动化浏览器安全策略不允许在停止本地服务后再次导航，因此 OFF 断网冷启动保留为 A2759 standalone 真机发布门槛。

## 云备份安全裁决点

当前代码仓库是公开仓库。GitHub 官方说明公开仓库对互联网所有人可见，分支是仓库内部的平行版本，不能充当私密存储；官方同时要求将 PAT 当作密码。由此可知，把未加密学习备份写入本仓库 `backups` 分支会公开孩子的学习数据，本轮禁止实现。

推荐方案是创建独立私有备份仓库，并使用仅限该仓库 Contents 权限的 fine-grained PAT；备选是先设计客户端加密与恢复口令，再允许密文进入公开分支。在爸爸选定存储方案前，现有本地 JSON 导出/导入继续作为安全兜底。

官方依据：

- [About repositories · GitHub Docs](https://docs.github.com/en/repositories/creating-and-managing-repositories/about-repositories)
- [Managing your personal access tokens · GitHub Docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

## 未扩大适配范围

本轮只收口 A2759 横屏 standalone PWA。13 英寸、其他 iPad、竖屏、Split View、iPhone 与桌面仍按既有多尺寸状态文档延期；本轮新增的通用 PWA 能力不等于这些尺寸已经适配。
