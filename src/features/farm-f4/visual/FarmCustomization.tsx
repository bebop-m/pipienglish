import type { CSSProperties } from 'react'
import type {
  DecorationCatalogItemVM,
  FarmHomeEvent,
  FarmHomeViewModel,
  WardrobeItemVM,
} from '../../../application/viewmodel'
import type { SceneLayer } from '../../../domain/farmScenes'
import { f4AssetUrl } from '../assetUrl'
import { APPROVED_STANDARD_CHARACTER_LAYERS } from './characterLayerContract'
import { LayeredCharacter } from './LayeredCharacter'

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

export function FarmDecorations({ vm, layer }: { vm: FarmHomeViewModel; layer: SceneLayer }) {
  return (
    <div className={`farm-decorations-f7 is-${layer}`} aria-hidden="true">
      {vm.placedDecorations
        .filter(item => item.definition.layer === layer && item.definition.assetStatus === 'approved')
        .map(item => {
          const layout = decorationRenderLayout(item)
          if (!layout) return null
          const style: CSSProperties = {
            left: layout.left,
            top: layout.top,
            width: layout.width,
            height: layout.height,
            '--f7-depth-key': layout.depthKey,
          } as CSSProperties
          return <img key={item.definition.id} src={f4AssetUrl(item.definition.assetId)} alt="" style={style} />
        })}
    </div>
  )
}

function decorationLabel(item: DecorationCatalogItemVM): string {
  return item.definition.kind === 'small' ? '小贴纸' : item.definition.kind === 'medium' ? '中型摆设' : '地标'
}

function wardrobeLabel(item: WardrobeItemVM): string {
  const labels: Record<WardrobeItemVM['definition']['catalogKind'], string> = {
    xiaopi_hair: '小皮发型',
    xiaopi_hat_look: '小皮帽子造型',
    xiaopi_outfit: '小皮服装',
    xiaopi_accessory: '小皮饰品',
    mother_headwear: '母鸡头饰',
    mother_neckwear: '母鸡颈饰',
  }
  return labels[item.definition.catalogKind]
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
      <button className="panel-backdrop-f4 is-visible" type="button" aria-label="关闭贴纸目录" onClick={() => dispatch({ type: 'CLOSE_DECORATION_CATALOG' })} />
      <section className="customization-panel-f7" aria-label={`${vm.viewedScene.title}贴纸目录`}>
        <button className="panel-close-f4" type="button" aria-label="关闭" onClick={() => dispatch({ type: 'CLOSE_DECORATION_CATALOG' })}>×</button>
        <p className="k-eyebrow">{vm.viewedScene.title}</p><h2>布置农场</h2>
        <div className="customization-grid-f7">
          {vm.decorationCatalog.map(item => {
            const bounds = item.definition.placementBounds
            const center = { x: (bounds.xMin + bounds.xMax) / 2, y: (bounds.yMin + bounds.yMax) / 2 }
            return (
              <article key={item.definition.id}>
                <strong>{decorationLabel(item)}</strong>
                <small>{item.definition.eggCost} 颗蛋 · {item.definition.layer}</small>
                {!item.owned
                  ? <button type="button" onClick={() => dispatch({ type: 'BUY_DECORATION', sceneId: vm.viewedSceneId, itemId: item.definition.id })}>购买</button>
                  : item.placement
                    ? <button type="button" onClick={() => dispatch({ type: 'STORE_DECORATION', sceneId: vm.viewedSceneId, itemId: item.definition.id })}>收起来</button>
                    : <button type="button" onClick={() => dispatch({ type: 'PLACE_DECORATION', sceneId: vm.viewedSceneId, itemId: item.definition.id, home: center })}>摆出来</button>}
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
  return (
    <>
      <button className="panel-backdrop-f4 is-visible" type="button" aria-label="关闭衣柜" onClick={() => dispatch({ type: 'CLOSE_WARDROBE' })} />
      <section className="customization-panel-f7 wardrobe-panel-f7" aria-label="角色衣柜">
        <button className="panel-close-f4" type="button" aria-label="关闭" onClick={() => dispatch({ type: 'CLOSE_WARDROBE' })}>×</button>
        <p className="k-eyebrow">购买永久 · 换装免费</p><h2>角色衣柜</h2>
        <div className="wardrobe-preview-f7">
          <LayeredCharacter group={{ target: 'xiaopi', surface: 'wardrobe', loadout: vm.loadout.xiaopi, home: { x: 0, y: 0 }, layers: APPROVED_STANDARD_CHARACTER_LAYERS.xiaopi }} />
          <LayeredCharacter group={{ target: 'mother', surface: 'wardrobe', loadout: vm.loadout.mother, home: { x: 270, y: 25 }, layers: APPROVED_STANDARD_CHARACTER_LAYERS.mother }} />
        </div>
        <div className="customization-grid-f7">
          {vm.wardrobeCatalog.map(item => (
            <article key={item.definition.id}>
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
