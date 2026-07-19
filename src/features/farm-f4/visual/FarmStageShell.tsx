import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useStageScale } from '../stage/useStageScale'
import '../../../styles/f4/stage.css'

interface FarmStageShellProps {
  children?: ReactNode
  ariaLabel?: string
  backgroundAssetUrl?: string
}

type StageCustomProperties = CSSProperties & {
  '--f4-stage-left': string
  '--f4-stage-top': string
  '--f4-stage-scale': number
}

export function FarmStageShell({
  children,
  ariaLabel = '皮皮のEnglish 小鸡农场',
  backgroundAssetUrl,
}: FarmStageShellProps) {
  const safeAreaRef = useRef<HTMLDivElement>(null)
  const stage = useStageScale(safeAreaRef)
  const stageStyle: StageCustomProperties = {
    '--f4-stage-left': `${stage.left}px`,
    '--f4-stage-top': `${stage.top}px`,
    '--f4-stage-scale': stage.scale,
  }

  return (
    <div className="f4-viewport">
      <div
        className="f4-bleed"
        style={backgroundAssetUrl ? { backgroundImage: `url("${backgroundAssetUrl}")` } : undefined}
        aria-hidden="true"
      />

      <div className="f4-safe-area" ref={safeAreaRef}>
        <main
          className="f4-stage"
          style={stageStyle}
          data-ready={stage.ready}
          data-below-comfort={stage.belowComfort}
          aria-label={ariaLabel}
          aria-hidden={!stage.ready || stage.belowComfort}
        >
          <div className="f4-stage__content">{children}</div>
        </main>

        <div className="f4-fullscreen-hint" hidden={!stage.ready || !stage.belowComfort} role="status">
          <div className="f4-hint-card">
            <strong>请全屏打开小鸡农场</strong>
            <span>这样小鸡、文字和按钮都会保持舒服的大小。</span>
          </div>
        </div>
      </div>

      <div className="f4-orientation-hint" aria-live="polite">
        <div className="f4-hint-card">
          <strong>把 iPad 横过来吧</strong>
          <span>小鸡农场在横屏里住得最舒服。</span>
        </div>
      </div>
    </div>
  )
}
