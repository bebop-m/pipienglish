import type { CSSProperties } from 'react'
import { f4AssetUrl } from '../assetUrl'
import type { LayeredCharacterGroupVM } from './characterLayerContract'

export interface LayeredCharacterProps {
  group: LayeredCharacterGroupVM
  className?: string
}

/**
 * 框架 8 阶段 B 的纯渲染容器。正式页面只渲染 approved 层；internal-placeholder
 * 不生成 img、剪影或空槽。当前首页仍由 FarmActors 使用已批准标准造型。
 */
export function LayeredCharacter({ group, className = '' }: LayeredCharacterProps) {
  const visibleLayers = group.layers.filter(layer => layer.assetStatus === 'approved')
  const style: CSSProperties = {
    position: 'absolute',
    left: group.home.x,
    top: group.home.y,
    width: visibleLayers[0]?.anchor.displayBoxPt.width ?? 0,
    height: visibleLayers[0]?.anchor.displayBoxPt.height ?? 0,
  }
  return (
    <span className={`layered-character-f7 ${className}`.trim()} data-character={group.target} style={style}>
      {visibleLayers.map(layer => (
        <img
          key={layer.logicalId}
          className="layered-character-f7__layer"
          data-layer-role={layer.role}
          src={f4AssetUrl(layer.assetId)}
          alt=""
          draggable={false}
        />
      ))}
    </span>
  )
}
