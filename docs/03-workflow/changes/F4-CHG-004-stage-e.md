# F4-CHG-004 — 阶段 E 群聊与落点持久化

```yaml
change_id: F4-CHG-004
date: 2026-07-17
scope: chick-chat-tts-seen-placement
source_visual: design-samples/sticker-f-farm-v4.html
master_files_modified: false
deployment:
  pushed_commit: e49d161
  pushed_by: Claude
  final_closeout_changes_pending: true
```

## 落地内容

- 点真实小鸡后，从已经学习且仍存在于当前词库的卡片中按陈旧度加权抽词；抽到的词在同一个 Dexie 事务中更新 `seen.lastSeenAt`。
- 用例拒绝不存在的主小鸡，邻居去重、过滤不存在的小鸡并限制最多 3 只；旧备份中已不在当前词库的卡片不会生成空释义气泡。
- V-4 尚未裁决，正式首页继续使用“单气泡 + 真实抽词”：视觉层传空邻居数组，只让被点击的小鸡显示英文与中文；没有擅自启用多气泡。
- 气泡按 `expiresAt` 在约 4 秒后自动收起。连续快速点击使用请求序号，较早返回的异步请求不能覆盖较新的点击。
- 气泡使用礼貌播报的可访问状态区，小鸡按钮明确说明“点按听单词，拖动可以搬家”。
- 40 只可见上限与鸡舍计数已经在数据侧验证；V-5 未裁决前，视觉层仍只安排母版已有的 6 个小鸡位置。

## TTS

- 优先选择本地 `en-US` 声音，其次远程 `en-US`，最后其他英语声音；语言标签大小写不影响选择。
- 每次播放先取消上一段语音，再以 `en-US`、`rate = 0.85` 播放主气泡单词，避免快速点按造成叠音。
- 没有 `speechSynthesis`、没有 `SpeechSynthesisUtterance` 或设备实现抛错时返回失败并无声降级，气泡和见面记录不受影响。
- 应用内验收浏览器不提供系统 TTS，已验证无声降级且页面无报错；实际发声、声音选择与音量仍必须在 A2759 standalone PWA 上抽听。

## 拖拽与持久化

- 小鸡落点继续以 1194×834 逻辑坐标写入 `chicks.homeX/homeY`，刷新后由 VM 恢复。
- 应用层拒绝不存在的小鸡和 `NaN`/无穷坐标。
- 正常 `pointerup` 才提交落点；系统触发 `pointercancel` 时回到拖拽起点，不把中断位置错误保存。
- 阶段 C 已验证 Pointer Capture 的实际拖拽手势；本阶段浏览器通过仅开发环境事件入口派发同一个 `CHICK_PLACED`，确认刷新前后目标小鸡屏幕矩形完全一致。

## 内部验收入口

开发壳新增群聊验收数据、关闭自主运动和固定落点按钮。它们通过正式学习/首页事件或真实 Dexie 表准备数据，均受 `import.meta.env.DEV` 限制，不属于面向小皮的生产交互。

## 验证

- Vitest：8 个文件，39/39 通过。
- `npm run build`：TypeScript、Vite 与 PWA 生产构建通过。
- A2759 等效横屏浏览器：真实词库气泡出现、单气泡约 4 秒收起、无 TTS 环境安全降级、落点刷新保持通过。
- 浏览器 console：0 error / 0 warning。
- `design-samples/sticker-f-farm-v4.{html,css,js}` 母版未修改。

## 剩余门槛

- V-4 多气泡行为仍由爸爸与小皮裁决；当前单气泡实现可独立上线。
- V-5 40+ 小鸡密度和鸡舍视觉仍待 Codex 提案、爸爸确认。
- A2759 真机需要抽听系统英语声音；这是完整上线前的真机门槛，不阻塞进入阶段 F。
