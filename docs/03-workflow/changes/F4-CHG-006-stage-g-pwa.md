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

### A2759 图标真机回归

首版图标把母图外围约 30px 的白色展示画布一起缩小，iPadOS 再施加主屏幕圆角后出现明显双重白边。修正版只机械裁掉四边各 30px 展示留白，再从同一锁定母图派生全部尺寸；没有重画或改变构图。Apple 图标 URL 同步升级为 `apple-touch-icon-v2.png`，绕过 iPadOS 对旧 URL 的图标缓存；验收时需先删除旧主屏幕图标，再从 Safari 重新添加。

## 云备份最终裁决

当前代码仓库是公开仓库。GitHub 官方说明公开仓库对互联网所有人可见，分支是仓库内部的平行版本，不能充当私密存储；官方同时要求将 PAT 当作密码。由此可知，把未加密学习备份写入本仓库 `backups` 分支会公开孩子的学习数据，本轮禁止实现。

**2026-07-17 爸爸裁决：这是小皮个人使用的小软件，不建设独立私有备份仓库，也不实现 GitHub 云备份。**数据仅保存在设备本地；家长页提供手动 JSON 导出/导入和定期提醒，导出文件由爸爸自行保存。现有公开 `backups` 分支保持不用。

官方依据：

- [About repositories · GitHub Docs](https://docs.github.com/en/repositories/creating-and-managing-repositories/about-repositories)
- [Managing your personal access tokens · GitHub Docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

## 未扩大适配范围

本轮只收口 A2759 横屏 standalone PWA。13 英寸、其他 iPad、竖屏、Split View、iPhone 与桌面仍按既有多尺寸状态文档延期；本轮新增的通用 PWA 能力不等于这些尺寸已经适配。
