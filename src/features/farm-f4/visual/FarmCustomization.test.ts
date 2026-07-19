import { describe, expect, it } from 'vitest'
import type { DecorationCatalogItemVM } from '../../../application/viewmodel'
import { clampPointToPlacementBounds, pointWithinPlacementBounds } from '../../../domain/farmCustomization'
import { FARM_SCENE_DEFINITIONS } from '../../../domain/farmScenes'
import { decorationRenderLayout } from './FarmCustomization'

describe('decoration renderer contract', () => {
  it('converts the persisted ground point to a stable display rectangle', () => {
    const definition = FARM_SCENE_DEFINITIONS[0].decorationCatalog[0]
    const item: DecorationCatalogItemVM = {
      definition,
      owned: true,
      placement: { x: 600, y: 700 },
    }
    const layout = decorationRenderLayout(item)!
    expect(layout.width).toBe(definition.render.displayBoxPt.width)
    expect(layout.height).toBe(definition.render.displayBoxPt.height)
    expect(layout.depthKey).toBe(700)
    expect(layout.left + definition.render.groundAnchorPx.x / 1254 * layout.width).toBeCloseTo(600)
    expect(layout.top + definition.render.groundAnchorPx.y / 1254 * layout.height).toBeCloseTo(700)
    expect(decorationRenderLayout({ ...item, placement: null })).toBeNull()
  })

  it('re-anchors and stays inside bounds across a drag that overshoots the stage', () => {
    const definition = FARM_SCENE_DEFINITIONS[0].decorationCatalog[0]
    const bounds = definition.placementBounds
    // 皮皮把贴纸拖出舞台外:落点先钳回范围,再按同一锚点契约重算显示框
    const dropped = clampPointToPlacementBounds({ x: 5000, y: -400 }, bounds)
    expect(pointWithinPlacementBounds(dropped, bounds)).toBe(true)
    expect(dropped).toEqual({ x: bounds.xMax, y: bounds.yMin })

    const item: DecorationCatalogItemVM = { definition, owned: true, placement: dropped }
    const layout = decorationRenderLayout(item)!
    expect(layout.depthKey).toBe(dropped.y)
    expect(layout.left + definition.render.groundAnchorPx.x / 1254 * layout.width).toBeCloseTo(dropped.x)
    expect(layout.top + definition.render.groundAnchorPx.y / 1254 * layout.height).toBeCloseTo(dropped.y)
  })
})
