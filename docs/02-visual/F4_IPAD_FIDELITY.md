# F4 · iPad Pro 像素保真落地规范

## 1. “和 F4 一模一样”的工程定义

“一样”不是让不同 iPad 各自重新排版，而是：

1. F4 的核心世界始终使用 **1194×834 CSS px（设计 pt）固定坐标系**；
2. 背景、UI、角色和命中区域作为一个整体等比缩放；
3. 不同宽高比多出的空间只显示同一农场背景的延展层，不拉伸、不裁掉、不挪动核心内容；
4. 交互状态、层级、动效时长和图片版本与母版一致；
5. 通过自动截图对比，而不是凭感觉判断“差不多”。

F4 设计样板是视觉母版，不直接等于已经完成的生产适配。正式 React/PWA 页面需要按本文增加固定舞台外壳。

## 2. 页面结构

```html
<div class="f4-viewport">
  <div class="f4-bleed" aria-hidden="true"></div>
  <main class="f4-stage" aria-label="皮皮 English 小鸡农场">
    <!-- F4 的全部背景、UI、角色与弹层 -->
  </main>
  <div class="f4-fullscreen-hint" hidden>请全屏打开小鸡农场</div>
</div>
```

- `.f4-viewport`：填满 PWA 可用视口并处理安全区。
- `.f4-bleed`：只负责补足非 1194:834 的外围区域，不承载文字、角色、按钮或碰撞逻辑。
- `.f4-stage`：永远是 1194×834；所有设计坐标、拖拽坐标和动画终点都落在这里。
- 正式版本不得让核心舞台使用 `width: min(100vw, ...)` 后再让内部固定像素元素分别响应式变化。

## 3. 唯一缩放公式

设安全区内可用尺寸为 `W × H`：

```text
scale = min(W / 1194, H / 834)
stageLeft = safeLeft + (W - 1194 × scale) / 2
stageTop  = safeTop  + (H - 834 × scale) / 2
```

```css
.f4-viewport {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #bfe5f7;
  touch-action: none;
}

.f4-bleed {
  position: absolute;
  inset: 0;
  background: #bfe5f7 url("/assets/f4/farm-background-f3.png") center / cover no-repeat;
}

.f4-stage {
  position: absolute;
  width: 1194px;
  height: 834px;
  overflow: hidden;
  transform: translate3d(var(--stage-left), var(--stage-top), 0)
             scale(var(--stage-scale));
  transform-origin: 0 0;
  background: #bfe5f7 url("/assets/f4/farm-background-f3.png") center / cover no-repeat;
}
```

不得给 X/Y 使用不同缩放比；不得为 13 英寸版本单独拉宽任务板或移动角色。外围延展层允许露出更多农场色彩，但核心舞台内部保持完全相同。

## 4. 坐标与拖拽

浏览器事件坐标必须转换回 1194×834 的逻辑坐标：

```ts
const rect = stage.getBoundingClientRect();
const x = (event.clientX - rect.left) / stageScale;
const y = (event.clientY - rect.top) / stageScale;
```

- 角色位置、散步分区、避障框、拖拽终点、弹层锚点全部保存为逻辑坐标。
- 不用缩放后的 `offsetWidth` 混合未缩放的设计坐标。
- 透明 PNG 的碰撞框按可见主体设定，不直接使用整个 1254×1254 透明画布；孵化棚透明顶部尤其不能形成空气墙。
- 拖拽时使用 Pointer Events 和 `setPointerCapture`；小鸡设置 `touch-action: none`，其他页面仍允许系统需要的触控行为。
- 手动放置后，以落点为新的局部散步中心；页面状态需要保存时记录逻辑坐标而非设备像素。

## 5. 图片与文字保真

- F4 现有背景为 1501×1048。它足以作为样板，但生产母版建议补做 **2388×1668 或更高**的同构图版本；在小皮确认前不得用“重绘高清版”替换当前图。
- 角色和物件当前多为 1254×1254 RGBA，满足现有显示尺寸的高 DPR 展示。
- 保留 sRGB 色彩空间；构建压缩不得改变透明边缘、色温或水粉纹理。
- PNG 转 WebP/AVIF 必须先做 A/B 截图对比；无损或肉眼无差异才可替换，并登记新哈希。
- iPad 中文主字体按 `PingFang SC` 优先。若要求跨系统文字也逐像素一致，必须本地打包有合法授权的固定字体；否则允许系统字形抗锯齿存在极小差别，但字号、字重、行高和换行不得变化。
- 文字不得烘焙进背景。动态数字和文案必须仍可访问、可更新。

## 6. 安全区、方向与 PWA

- 正式产品以 iPad Pro 横屏、standalone PWA 为主；manifest 使用 `display: standalone` 和 `orientation: landscape`。
- HTML viewport 至少包含 `viewport-fit=cover`。
- 读取 `env(safe-area-inset-top/right/bottom/left)`，先得到安全矩形，再在安全矩形中居中舞台。
- 刘海、圆角或系统条只影响外层可用区域，不能使舞台内部组件单独位移。
- 横屏是小皮确认的唯一视觉母版。竖屏不承诺 F4 同构图；正式版应显示温和的“请横屏使用”引导，除非以后单独设计并确认竖屏母版。
- Split View 或浮窗小于可用门槛时，不继续压缩到难以触控；显示全屏提示。建议门槛为缩放系数 `< 0.72`。
- 所有资源本地打包并进入 Service Worker 预缓存；断网后首页、角色、交互和字体仍可用。

## 7. 层级与命中区

- 视觉层级固定为：背景 < 固定场景 < 可动角色 < 任务和状态入口 < 顶栏 < 弹层与遮罩。
- 所有主要触控目标不小于 44×44 逻辑 pt。
- 图片可见范围小于按钮时，可扩大透明命中区，但不能扩大避障区制造空气墙。
- 角色根据脚底 Y 坐标动态调整层级，保证前后穿行自然；拖拽时临时提升，松手后恢复深度排序。
- 页面缩放、系统字体放大和 PWA 启动过程不得出现先错位后跳回的闪烁；舞台比例计算完成前可短暂隐藏舞台。

## 8. 不可变母版与版本策略

- `F4_BASELINE_MANIFEST.md` 中的文件只读保存，不直接改造成生产文件。
- 正式实现从母版复制或导入，目录建议为 `src/features/farm-f4/` 与 `public/assets/f4/`。
- 新视觉版本使用 F5 或明确的资产后缀；不得把变化后的文件继续称为 F4。
- 每次替换图片、Token、尺寸、锚点或动效都必须记录：原因、前后截图、影响状态、小皮是否确认。

## 9. 视觉回归矩阵

至少保留以下自动截图：

| 用例 | 视口/模式 | 验证内容 |
|---|---|---|
| GM-01 | 1194×834，DPR 1 | 与 F4 黄金母版逐像素比较 |
| IP-11 | iPad Pro 11 横屏，standalone 等效视口 | 核心构图、字号、命中区、安全区 |
| IP-13 | iPad Pro 13 横屏，4:3 | 核心舞台不变，额外区域只有背景延展 |
| RM | 1194×834，减少动态 | 所有信息可用，无角色持续移动 |
| OFF | 断网 + 冷启动 | 所有 F4 图片、CSS、JS/React 与字体可加载 |
| DRAG | 11 与 13 英寸 | 拖拽坐标、孵化棚上方、边缘和避障区无空气墙 |

截图至少覆盖：初始首页、鸡蛋分配面板、孵化选项、锅中生蛋、煎蛋完成、孵化棚气泡、救援气泡、小鸡拖拽后状态。

验收时同时使用：

1. 透明度 50% 的基准/候选叠图，检查几何漂移；
2. 像素差异图，定位颜色、字体和边缘变化；
3. 真机 iPad Pro 添加到主屏幕后人工检查触控、动画流畅度和安全区。

任何自动差异阈值都不能替代对角色身份和画风的人工确认。

## 10. 上线前 Definition of Done

- F4 母版哈希校验通过，母版未被覆盖。
- 1194×834 黄金截图的元素位置、尺寸、层级、换行与确认稿一致。
- 11/13 英寸横屏只发生整体等比缩放和背景延展，无内部响应式重排。
- 小鸡拖拽、自由散步、角色互动、孵化、煎蛋和救援入口均通过真机测试。
- 断网冷启动通过；重新打开 PWA 后核心状态可恢复。
- `prefers-reduced-motion`、44pt 点击区、文字可读性和弹层焦点处理通过。
- 小皮对生产 PWA 的真机截图或真机页面完成最终确认。

