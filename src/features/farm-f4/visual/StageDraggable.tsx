import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import type { StagePoint } from '../../../domain/types'
import { STAGE_H, STAGE_W, toStagePoint } from '../stage/stagePoint'

interface StageDraggableProps {
  className: string
  ariaLabel: string
  home: StagePoint | null
  defaultHome: StagePoint
  size: { width: number; height: number }
  onPlaced: (home: StagePoint) => void
  children: ReactNode
}

interface ActiveDrag {
  pointerId: number
  captureTarget: HTMLElement
  offset: StagePoint
  start: StagePoint
  origin: StagePoint
  moved: boolean
}

export function StageDraggable({
  className,
  ariaLabel,
  home,
  defaultHome,
  size,
  onPlaced,
  children,
}: StageDraggableProps) {
  const elementRef = useRef<HTMLElement>(null)
  const initial = home ?? defaultHome
  const positionRef = useRef<StagePoint>({ ...initial })
  const dragRef = useRef<ActiveDrag | null>(null)
  const ignoreClickUntilRef = useRef(0)
  const [position, setPosition] = useState<StagePoint>({ ...initial })
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const next = home ?? defaultHome
    positionRef.current = { ...next }
    setPosition({ ...next })
  }, [defaultHome.x, defaultHome.y, home?.x, home?.y])

  const stageCoordinates = (clientX: number, clientY: number) => {
    const stage = elementRef.current?.closest<HTMLElement>('.f4-stage')
    if (!stage) return null
    const rect = stage.getBoundingClientRect()
    return toStagePoint(clientX, clientY, rect, rect.width / STAGE_W)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    const target = event.target as Element
    const handle = target.closest<HTMLElement>('[data-stage-drag-handle]')
    if (!handle || !event.currentTarget.contains(handle)) return
    const point = stageCoordinates(event.clientX, event.clientY)
    if (!point) return
    dragRef.current = {
      pointerId: event.pointerId,
      captureTarget: handle,
      offset: { x: point.x - positionRef.current.x, y: point.y - positionRef.current.y },
      start: point,
      origin: { ...positionRef.current },
      moved: false,
    }
    handle.setPointerCapture(event.pointerId)
    setDragging(true)
    event.preventDefault()
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const point = stageCoordinates(event.clientX, event.clientY)
    if (!point) return
    const next = {
      x: Math.min(STAGE_W - size.width - 12, Math.max(12, point.x - drag.offset.x)),
      y: Math.min(STAGE_H - size.height - 8, Math.max(180, point.y - drag.offset.y)),
    }
    if (Math.hypot(point.x - drag.start.x, point.y - drag.start.y) > 8) drag.moved = true
    positionRef.current = next
    setPosition(next)
    event.preventDefault()
  }

  const finishDrag = (event: ReactPointerEvent<HTMLElement>, cancelled = false) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (drag.captureTarget.hasPointerCapture(event.pointerId)) drag.captureTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
    setDragging(false)
    if (cancelled) {
      positionRef.current = drag.origin
      setPosition(drag.origin)
      return
    }
    if (!drag.moved) return
    ignoreClickUntilRef.current = Date.now() + 500
    onPlaced(positionRef.current)
  }

  const suppressDraggedClick = (event: React.MouseEvent<HTMLElement>) => {
    if (Date.now() >= ignoreClickUntilRef.current) return
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <section
      ref={elementRef}
      className={`${className} stage-draggable-f4 ${dragging ? 'is-dragging' : ''}`}
      aria-label={ariaLabel}
      style={{ left: position.x, top: position.y } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={event => finishDrag(event, true)}
      onClickCapture={suppressDraggedClick}
    >
      {children}
    </section>
  )
}
