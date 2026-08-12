# iOS 系列视口适配矩阵 · 2026-08-05

爸爸报告 mini 真机「显示尺寸不对,有些贴图看不到」后的排查与加固存档(F4-CHG-033)。
截图均为**快进 Day 23 日常态**(15 鸡 / 7 蛋 / 花花),Chromium 无头,DPR 1。
1194×834 固定舞台坐标系与唯一缩放公式未动。

| 文件 | 视口 | 对应设备/场景 | 结果 |
|---|---:|---|---|
| `baseline-1194x834.png` | 1194×834 | iPad Pro 11 横屏(黄金基准) | scale=1,与母版一致 |
| `mini6-landscape-1133x744.png` | 1133×744 | iPad mini 6/7 横屏 | scale=0.892,左右背景延展,12 张贴图全可见 |
| `mini5-landscape-1024x768.png` | 1024×768 | iPad mini 5 / 老 iPad 横屏(4:3) | scale=0.858,上下背景延展,全可见 |
| `air-landscape-1180x820.png` | 1180×820 | iPad Air 横屏 | scale=0.983,全可见 |
| `pro13-landscape-1366x1024.png` | 1366×1024 | iPad Pro 13 横屏 | scale=1.144 放大,全可见 |
| `mini6-safari-toolbar-1133x650.png` | 1133×650 | mini 横屏 Safari 未收起工具栏 | scale=0.779,仍高于 0.72 舒适阈值,全可见 |
| `mini6-portrait-744x1133.png` | 744×1133 | mini 竖屏 | 按 2026-07-17 裁决显示「把 iPad 横过来吧」 |
| `iphone15pm-landscape-932x430.png` | 932×430 | iPhone 15 Pro Max 横屏 | scale=0.516 < 0.72,按裁决显示全屏提示(iPhone 另行设计) |

## 本轮代码加固

1. `index.html`:状态栏改 `black-translucent`,standalone 下舞台用满整块屏(此前 default 状态栏挤压可用高度)。
2. `useStageScale.ts`:补 `window.resize` 与 `visualViewport.resize` 监听,兜住 iOS 旋转/Safari 工具栏伸缩时 ResizeObserver 对 fixed 容器的时序缺口。

## 结论

桌面模拟无法复现「贴图看不到」;若真机更新后仍出现,按 `CURRENT_TASK.md`「真机确诊待办」提供截图与打开方式(主屏图标 / Safari)继续定位。
