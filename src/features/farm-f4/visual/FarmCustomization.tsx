import { useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type {
  DecorationCatalogItemVM,
  FarmHomeEvent,
  FarmHomeViewModel,
  WardrobeItemVM,
} from '../../../application/viewmodel'
import {
  clampPointToPlacementBounds,
  initialDecorationHome,
  resolveDecorationHome,
} from '../../../domain/farmCustomization'
import type { SceneLayer } from '../../../domain/farmScenes'
import type { StagePoint } from '../../../domain/types'
import { f4AssetUrl } from '../assetUrl'
import { STAGE_W, toStagePoint } from '../stage/stagePoint'
import { characterAppearanceAssetId } from './characterAppearance'

interface CustomizationProps {
  vm: FarmHomeViewModel
  dispatch: (event: FarmHomeEvent) => Promise<void>
}

export interface DecorationRenderLayout {
  left: number
  top: number
  width: number
  height: number
  depthKey: number
}

/** 将持久化 ground anchor 转为透明画布左上角；与设备缩放无关。 */
export function decorationRenderLayout(item: DecorationCatalogItemVM): DecorationRenderLayout | null {
  const home = item.placement
  if (!home) return null
  const { canvasPx, displayBoxPt, groundAnchorPx } = item.definition.render
  return {
    left: home.x - groundAnchorPx.x / canvasPx.width * displayBoxPt.width,
    top: home.y - groundAnchorPx.y / canvasPx.height * displayBoxPt.height,
    width: displayBoxPt.width,
    height: displayBoxPt.height,
    depthKey: home.y,
  }
}

function decorationLayoutStyle(item: DecorationCatalogItemVM, home: StagePoint): CSSProperties {
  const layout = decorationRenderLayout({ ...item, placement: { ...item.placement!, x: home.x, y: home.y } })!
  return {
    left: layout.left,
    top: layout.top,
    width: layout.width,
    height: layout.height,
    '--f7-depth-key': layout.depthKey,
    ...(item.definition.layer === 'actor' ? { zIndex: depthZIndex(layout.depthKey) } : {}),
  } as CSSProperties
}

/** 中层贴纸与角色共用的深度 z-index:按脚底 y 映射到 20–40,谁靠下谁在前(与 FarmActors 同一公式) */
export function depthZIndex(groundY: number): number {
  return 20 + Math.round(Math.max(0, Math.min(834, groundY)) / 42)
}

/** 已摆放贴纸:与小鸡一致的指针拖拽,落点钳回 placementBounds 后经 PLACE_DECORATION 免费持久化 */
function DraggableDecoration({
  item,
  onPlaced,
}: {
  item: DecorationCatalogItemVM
  onPlaced: (home: StagePoint) => void
}) {
  const elementRef = useRef<HTMLButtonElement>(null)
  const homeRef = useRef<StagePoint>({ x: item.placement!.x, y: item.placement!.y })
  const dragRef = useRef<{ pointerId: number; offset: StagePoint; start: StagePoint; origin: StagePoint; moved: boolean } | null>(null)

  const applyHome = (home: StagePoint) => {
    homeRef.current = home
    const element = elementRef.current
    if (!element) return
    const style = decorationLayoutStyle(item, home)
    element.style.left = `${style.left}px`
    element.style.top = `${style.top}px`
    element.style.setProperty('--f7-depth-key', `${home.y}`)
    if (item.definition.layer === 'actor') element.style.zIndex = `${depthZIndex(home.y)}`
  }

  // 落点由外部变化(刷新恢复、收起再摆)时同步;拖动中不打断跟手
  useEffect(() => {
    if (dragRef.current) return
    applyHome({ x: item.placement!.x, y: item.placement!.y })
  }, [item.placement?.x, item.placement?.y])

  const stageCoordinates = (clientX: number, clientY: number) => {
    const stage = elementRef.current?.closest<HTMLElement>('.f4-stage')
    if (!stage) return null
    const rect = stage.getBoundingClientRect()
    return toStagePoint(clientX, clientY, rect, rect.width / STAGE_W)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    const point = stageCoordinates(event.clientX, event.clientY)
    if (!point) return
    dragRef.current = {
      pointerId: event.pointerId,
      offset: { x: point.x - homeRef.current.x, y: point.y - homeRef.current.y },
      start: point,
      origin: { ...homeRef.current },
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.classList.add('is-dragging')
    event.preventDefault()
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const point = stageCoordinates(event.clientX, event.clientY)
    if (!point) return
    if (Math.hypot(point.x - drag.start.x, point.y - drag.start.y) > 8) drag.moved = true
    applyHome(clampPointToPlacementBounds(
      { x: point.x - drag.offset.x, y: point.y - drag.offset.y },
      item.definition.placementBounds,
    ))
    event.preventDefault()
  }

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
    event.currentTarget.classList.remove('is-dragging')
    if (cancelled || !drag.moved) {
      applyHome(drag.origin)
      return
    }
    // 松手才推出保留区:拖到任务卡或右下按钮组背后会被推回可点区域,不会永久藏起来
    const placed = resolveDecorationHome(item.definition, homeRef.current)
    applyHome(placed)
    onPlaced(placed)
  }

  return (
    <button
      ref={elementRef}
      className="farm-decoration-f7"
      type="button"
      aria-label={`拖动摆放${decorationLabel(item)}`}
      style={decorationLayoutStyle(item, homeRef.current)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={event => finishDrag(event, true)}
    >
      <img src={f4AssetUrl(item.definition.assetId)} alt="" draggable={false} />
    </button>
  )
}

export function FarmDecorations({ vm, layer, dispatch }: { vm: FarmHomeViewModel; layer: SceneLayer; dispatch: (event: FarmHomeEvent) => Promise<void> }) {
  return (
    <div className={`farm-decorations-f7 is-${layer}`}>
      {vm.placedDecorations
        .filter(item => item.definition.layer === layer && item.definition.assetStatus === 'approved')
        .map(item => (
          <DraggableDecoration
            key={item.definition.id}
            item={item}
            onPlaced={home => dispatch({ type: 'PLACE_DECORATION', sceneId: vm.viewedSceneId, itemId: item.definition.id, home })}
          />
        ))}
    </div>
  )
}

function decorationLabel(item: DecorationCatalogItemVM): string {
  return item.definition.displayName
}

function decorationKindLabel(item: DecorationCatalogItemVM): string {
  return item.definition.kind === 'small' ? '小装饰' : item.definition.kind === 'medium' ? '中型摆设' : '果园地标'
}

function wardrobeLabel(item: WardrobeItemVM): string {
  return item.definition.displayName
}

export function CustomizationEntrances({ vm, dispatch }: CustomizationProps) {
  if (vm.decorationCatalog.length === 0 && vm.wardrobeCatalog.length === 0) return null
  return (
    <div className="customization-entrances-f7">
      {vm.decorationCatalog.length > 0 && (
        <button type="button" onClick={() => dispatch({ type: 'OPEN_DECORATION_CATALOG' })}>布置农场</button>
      )}
      {vm.wardrobeCatalog.length > 0 && (
        <button type="button" onClick={() => dispatch({ type: 'OPEN_WARDROBE' })}>打开衣柜</button>
      )}
    </div>
  )
}

export function DecorationCatalogPanel({ vm, dispatch }: CustomizationProps) {
  if (vm.overlay !== 'sticker_catalog') return null
  return (
    <>
      <button className="panel-backdrop-f4 is-visible" type="button" aria-label="关闭装饰商店" onClick={() => dispatch({ type: 'CLOSE_DECORATION_CATALOG' })} />
      <section className="customization-panel-f7" aria-label={`${vm.viewedScene.title}装饰商店`}>
        <button className="panel-close-f4" type="button" aria-label="关闭" onClick={() => dispatch({ type: 'CLOSE_DECORATION_CATALOG' })}>×</button>
        <p className="k-eyebrow">{vm.viewedScene.title} · 用鸡蛋永久收藏</p><h2>装饰商店</h2>
        <div className="customization-grid-f7">
          {vm.decorationCatalog.map(item => {
            // 摆出来:避开已摆放贴纸与 UI 保留区,不再全部叠在范围中心
            const placeAt = () => initialDecorationHome(
              item.definition,
              vm.placedDecorations.map(placed => ({ definition: placed.definition, home: placed.placement! })),
            )
            return (
              <article key={item.definition.id}>
                <div className="customization-item-preview-f7">
                  <img src={f4AssetUrl(item.definition.assetId)} alt={item.definition.displayName} />
                </div>
                <strong>{decorationLabel(item)}</strong>
                <small>{item.definition.eggCost} 颗蛋 · {decorationKindLabel(item)}</small>
                {!item.owned
                  ? <button type="button" onClick={() => dispatch({ type: 'BUY_DECORATION', sceneId: vm.viewedSceneId, itemId: item.definition.id })}>购买</button>
                  : item.placement
                    ? <button type="button" onClick={() => dispatch({ type: 'STORE_DECORATION', sceneId: vm.viewedSceneId, itemId: item.definition.id })}>收起来</button>
                    : <button type="button" onClick={() => dispatch({ type: 'PLACE_DECORATION', sceneId: vm.viewedSceneId, itemId: item.definition.id, home: placeAt() })}>摆出来</button>}
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}

export function WardrobePanel({ vm, dispatch }: CustomizationProps) {
  if (vm.overlay !== 'wardrobe') return null
  const xiaopiAppearance = characterAppearanceAssetId(
    vm.viewedSceneId,
    'xiaopi',
    vm.loadout,
    vm.viewedScene.characterVisuals.xiaopiAssetId,
  )
  const motherAppearance = characterAppearanceAssetId(
    vm.viewedSceneId,
    'mother',
    vm.loadout,
    vm.viewedScene.characterVisuals.motherAssetId,
  )
  return (
    <>
      <button className="panel-backdrop-f4 is-visible" type="button" aria-label="关闭衣柜" onClick={() => dispatch({ type: 'CLOSE_WARDROBE' })} />
      <section className="customization-panel-f7 wardrobe-panel-f7" aria-label="角色衣柜">
        <button className="panel-close-f4" type="button" aria-label="关闭" onClick={() => dispatch({ type: 'CLOSE_WARDROBE' })}>×</button>
        <p className="k-eyebrow">购买永久 · 换装免费</p><h2>角色衣柜</h2>
        <div className="wardrobe-preview-f7">
          <img className="wardrobe-character-preview-f7 is-xiaopi" src={f4AssetUrl(xiaopiAppearance)} alt="小皮当前造型" />
          <img className="wardrobe-character-preview-f7 is-mother" src={f4AssetUrl(motherAppearance)} alt="母鸡当前造型" />
        </div>
        <div className="customization-grid-f7">
          {vm.wardrobeCatalog.map(item => (
            <article key={item.definition.id}>
              <div className="customization-item-preview-f7">
                <img src={f4AssetUrl(item.definition.previewAssetId)} alt={item.definition.displayName} />
              </div>
              <strong>{wardrobeLabel(item)}</strong><small>{item.definition.eggCost} 颗蛋</small>
              {!item.owned
                ? <button type="button" onClick={() => dispatch({ type: 'BUY_COSMETIC', itemId: item.definition.id })}>购买</button>
                : item.equipped
                  ? <button type="button" onClick={() => dispatch({ type: 'UNEQUIP_COSMETIC', target: item.definition.target, slot: item.definition.slot })}>换回默认</button>
                  : <button type="button" onClick={() => dispatch({ type: 'EQUIP_COSMETIC', target: item.definition.target, slot: item.definition.slot, itemId: item.definition.id })}>穿上</button>}
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
