# 救援闭环 · 生产视觉回归

本目录保存爸爸裁决后直接投产的 1194×834 救援与暂停日截图，不覆盖 `../stage-h-production/` 既有基准。

| 状态 | 截图 | 结果 |
|---|---|---|
| 暂停日任务板 | `paused-task-board-1194x834.png` | 真实连胜与复习数、进度和开始按钮正常 |
| 救援听看 | `rescue-1-listen-1194x834.png` | 强制正式无图版；救援头部第 1/4 步 |
| 救援描红 | `rescue-2-trace-1194x834.png` | 四线三格、触控画布；救援头部第 2/4 步 |
| 救援选择 | `rescue-3-choice-1194x834.png` | 四个纯中文选项；救援头部第 3/4 步 |
| 救援默写 | `rescue-4-dictation-1194x834.png` | 标准英文输入且无“想不起来”；救援头部第 4/4 步 |
| 农场待救 1→0 | `farm-rescue-count-1-1194x834.png` / `farm-rescue-count-0-1194x834.png` | 完成后角标递减 |
| 断网救援 | `offline-rescue-choice-1194x834.png` | Service Worker 冷启动与救援图片缓存正常 |

批量 Chromium 偶发黑块属于截图合成伪影；问题图使用独立进程、停用截图动画并等待稳定绘制后重抓，再经肉眼复查归档。
