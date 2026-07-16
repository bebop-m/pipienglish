import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { FarmChickVM, FarmHomeEvent, FarmHomeViewModel } from '../../../application/viewmodel'
import type { StagePoint } from '../../../domain/types'
import { f4AssetUrl } from '../assetUrl'
import { STAGE_H, STAGE_W, toStagePoint } from '../stage/stagePoint'

type ActorKind = 'mother' | 'farmer' | 'chick'
type Talk = { line: string; translation: string } | null

interface ActorSpec {
  id: string
  kind: ActorKind
  label: string
  image: string
  home: StagePoint
  talk: Talk
  chick?: FarmChickVM
}

interface FarmActorsProps {
  vm: FarmHomeViewModel
  dispatch: (event: FarmHomeEvent) => Promise<void>
}

const CHICK_HOMES: StagePoint[] = [
  { x: 365, y: 470 },
  { x: 475, y: 650 },
  { x: 680, y: 640 },
  { x: 925, y: 650 },
  { x: 655, y: 410 },
  { x: 990, y: 455 },
]

const ACTOR_SIZE: Record<ActorKind, { width: number; height: number }> = {
  mother: { width: 220, height: 220 },
  farmer: { width: 252, height: 274 },
  chick: { width: 116, height: 116 },
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function actorZone(kind: ActorKind, home: StagePoint) {
  const size = ACTOR_SIZE[kind]
  const radiusX = kind === 'chick' ? 125 : 110
  const radiusY = kind === 'chick' ? 86 : 72
  return {
    minX: Math.max(330, home.x - radiusX),
    maxX: Math.min(STAGE_W - size.width - 18, home.x + radiusX),
    minY: Math.max(365, home.y - radiusY),
    maxY: Math.min(STAGE_H - size.height - 8, home.y + radiusY),
  }
}

function FarmActor({
  spec,
  motionEnabled,
  chat,
  ambientTalk,
  onChat,
  onPlaced,
}: {
  spec: ActorSpec
  motionEnabled: boolean
  chat: Talk
  ambientTalk: Talk
  onChat: () => void
  onPlaced: (home: StagePoint) => void
}) {
  const actorRef = useRef<HTMLButtonElement>(null)
  const positionRef = useRef({ ...spec.home })
  const animationRef = useRef<Animation | null>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const dragRef = useRef<{
    pointerId: number
    offset: StagePoint
    start: StagePoint
    origin: StagePoint
    lastValid: StagePoint
    moved: boolean
  } | null>(null)
  const ignoreClickUntilRef = useRef(0)
  const [localTalk, setLocalTalk] = useState<Talk>(null)
  const [dragging, setDragging] = useState(false)

  const syncPresentation = useCallback(() => {
    const actor = actorRef.current
    if (!actor) return
    const transform = getComputedStyle(actor).transform
    let dx = 0
    let dy = 0
    if (transform && transform !== 'none') {
      const matrix = new DOMMatrixReadOnly(transform)
      dx = matrix.m41
      dy = matrix.m42
    }
    animationRef.current?.cancel()
    animationRef.current = null
    positionRef.current = { x: positionRef.current.x + dx, y: positionRef.current.y + dy }
    actor.style.left = `${positionRef.current.x}px`
    actor.style.top = `${positionRef.current.y}px`
    actor.style.transform = 'none'
    actor.classList.remove('is-walking')
  }, [])

  const moveTo = useCallback(
    async (target: StagePoint) => {
      const actor = actorRef.current
      if (!actor || !motionEnabled || dragRef.current) return
      syncPresentation()
      const start = positionRef.current
      const dx = target.x - start.x
      const dy = target.y - start.y
      actor.querySelector('.sprite-shell-f3')?.classList.toggle('is-facing-left', dx < 0)
      actor.classList.add('is-walking')
      const animation = actor.animate(
        [{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(${dx}px, ${dy}px, 0)` }],
        { duration: randomBetween(9000, 15000), easing: 'ease-in-out', fill: 'forwards' },
      )
      animationRef.current = animation
      try {
        await animation.finished
      } catch {
        return
      }
      if (animationRef.current !== animation) return
      animation.cancel()
      positionRef.current = target
      actor.style.left = `${target.x}px`
      actor.style.top = `${target.y}px`
      actor.style.transform = 'none'
      actor.classList.remove('is-walking')
      animationRef.current = null
    },
    [motionEnabled, syncPresentation],
  )

  useEffect(() => {
    const actor = actorRef.current
    if (!actor) return
    actor.style.left = `${positionRef.current.x}px`
    actor.style.top = `${positionRef.current.y}px`
  }, [])

  useEffect(() => {
    window.clearTimeout(timerRef.current)
    if (!motionEnabled || dragging) {
      syncPresentation()
      return
    }
    let disposed = false
    const schedule = () => {
      timerRef.current = window.setTimeout(async () => {
        if (disposed) return
        const zone = actorZone(spec.kind, spec.home)
        await moveTo({ x: randomBetween(zone.minX, zone.maxX), y: randomBetween(zone.minY, zone.maxY) })
        if (!disposed) schedule()
      }, randomBetween(2600, 5600))
    }
    schedule()
    return () => {
      disposed = true
      window.clearTimeout(timerRef.current)
      syncPresentation()
    }
  }, [dragging, motionEnabled, moveTo, spec.home, spec.kind, syncPresentation])

  useEffect(() => () => animationRef.current?.cancel(), [])

  const stageCoordinates = (clientX: number, clientY: number) => {
    const actor = actorRef.current
    const stage = actor?.closest<HTMLElement>('.f4-stage')
    if (!stage) return null
    const rect = stage.getBoundingClientRect()
    return toStagePoint(clientX, clientY, rect, rect.width / STAGE_W)
  }

  const positionIsBlocked = (target: StagePoint) => {
    const actor = actorRef.current
    if (!actor || spec.kind !== 'chick') return false
    const actorBox = {
      left: target.x + ACTOR_SIZE.chick.width * 0.17,
      right: target.x + ACTOR_SIZE.chick.width * 0.83,
      top: target.y + ACTOR_SIZE.chick.height * 0.12,
      bottom: target.y + ACTOR_SIZE.chick.height * 0.92,
    }
    const obstacles = [
      { element: actor.closest('.farm-stage-f3')?.querySelector<HTMLElement>('.task-board-f3'), topInset: 0 },
      { element: actor.closest('.farm-stage-f3')?.querySelector<HTMLElement>('.hatchery-wrap-f4'), topInset: 45 },
      { element: actor.closest('.farm-stage-f3')?.querySelector<HTMLElement>('.rescue-wrap-f4'), topInset: 0 },
    ]
    return obstacles.some(({ element, topInset }) => {
      if (!element) return false
      const padding = 2
      const box = {
        left: element.offsetLeft - padding,
        right: element.offsetLeft + element.offsetWidth + padding,
        top: element.offsetTop + topInset - padding,
        bottom: element.offsetTop + element.offsetHeight + padding,
      }
      return actorBox.right > box.left && actorBox.left < box.right && actorBox.bottom > box.top && actorBox.top < box.bottom
    })
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (spec.kind !== 'chick' || event.button !== 0) return
    const point = stageCoordinates(event.clientX, event.clientY)
    if (!point) return
    syncPresentation()
    dragRef.current = {
      pointerId: event.pointerId,
      offset: { x: point.x - positionRef.current.x, y: point.y - positionRef.current.y },
      start: point,
      origin: { ...positionRef.current },
      lastValid: { ...positionRef.current },
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    event.preventDefault()
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const point = stageCoordinates(event.clientX, event.clientY)
    const actor = actorRef.current
    if (!point || !actor) return
    const size = ACTOR_SIZE.chick
    const next = {
      x: Math.min(STAGE_W - size.width - 18, Math.max(18, point.x - drag.offset.x)),
      y: Math.min(STAGE_H - size.height - 10, Math.max(300, point.y - drag.offset.y)),
    }
    if (Math.hypot(point.x - drag.start.x, point.y - drag.start.y) > 8) drag.moved = true
    positionRef.current = next
    if (!positionIsBlocked(next)) drag.lastValid = { ...next }
    actor.style.left = `${next.x}px`
    actor.style.top = `${next.y}px`
    event.preventDefault()
  }

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
    setDragging(false)
    if (cancelled) {
      positionRef.current = drag.origin
      const actor = actorRef.current
      if (actor) {
        actor.style.left = `${drag.origin.x}px`
        actor.style.top = `${drag.origin.y}px`
      }
      return
    }
    if (drag.moved) {
      if (positionIsBlocked(positionRef.current)) {
        positionRef.current = drag.lastValid
        const actor = actorRef.current
        if (actor) {
          actor.style.left = `${drag.lastValid.x}px`
          actor.style.top = `${drag.lastValid.y}px`
        }
      }
      ignoreClickUntilRef.current = Date.now() + 500
      onPlaced(positionRef.current)
      setLocalTalk({ line: '这里！', translation: 'I will stay near here.' })
      window.setTimeout(() => setLocalTalk(null), 2200)
    }
  }

  const onClick = () => {
    if (Date.now() < ignoreClickUntilRef.current) return
    if (spec.kind === 'chick') {
      onChat()
      return
    }
    setLocalTalk(spec.talk)
    window.setTimeout(() => setLocalTalk(null), 1800)
  }

  const visibleTalk = chat ?? ambientTalk ?? localTalk
  const gestureClass = visibleTalk ? (spec.kind === 'farmer' ? 'gesture-wave' : spec.kind === 'mother' ? 'gesture-wiggle' : 'gesture-hop') : ''

  return (
    <button
      ref={actorRef}
      className={`actor-f3 ${dragging ? 'is-dragging' : ''} ${visibleTalk ? 'is-talking' : ''} ${gestureClass}`}
      data-kind={spec.kind}
      data-chick-id={spec.chick?.chickId}
      type="button"
      aria-label={spec.label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={event => finishDrag(event, true)}
      onClick={onClick}
    >
      <span className="actor-talk-f3" role="status" aria-live="polite" aria-atomic="true" aria-hidden={!visibleTalk}>
        {visibleTalk && <>{visibleTalk.line}{visibleTalk.translation && <small>{visibleTalk.translation}</small>}</>}
      </span>
      <span className="sprite-shell-f3">
        <img className="sprite-f3" src={spec.image} alt="" draggable={false} />
      </span>
    </button>
  )
}

export function FarmActors({ vm, dispatch }: FarmActorsProps) {
  const [ambient, setAmbient] = useState<Record<string, Talk>>({})
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const ambientTimer = useRef<number | undefined>(undefined)
  const visibleChicks = useMemo(() => vm.chicksVisible.slice(0, CHICK_HOMES.length), [vm.chicksVisible])
  const specs = useMemo<ActorSpec[]>(
    () => [
      {
        id: 'mother',
        kind: 'mother',
        label: vm.henName ? `母鸡妈妈：${vm.henName}` : '母鸡妈妈',
        image: f4AssetUrl('mother-f3.png'),
        home: { x: 615, y: 530 },
        talk: { line: '咕咕，慢慢散步吧～', translation: "Let's take a walk!" },
      },
      {
        id: 'farmer',
        kind: 'farmer',
        label: '农场主小皮',
        image: f4AssetUrl('xiaopi-f3.png'),
        home: { x: 835, y: 495 },
        talk: { line: '今天也一起加油！', translation: "Let's do our best!" },
      },
      ...visibleChicks.map((chick, index) => ({
        id: chick.chickId,
        kind: 'chick' as const,
        label: '农场小鸡，点按听单词，拖动可以搬家',
        image: f4AssetUrl('chick-f3.png'),
        home: chick.home ?? CHICK_HOMES[index],
        talk: null,
        chick,
      })),
    ],
    [vm.henName, visibleChicks],
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const effectiveMotion = vm.motionEnabled && !reducedMotion

  useEffect(() => {
    window.clearTimeout(ambientTimer.current)
    if (!effectiveMotion || visibleChicks.length === 0) {
      setAmbient({})
      return
    }
    let disposed = false
    const schedule = () => {
      ambientTimer.current = window.setTimeout(() => {
        if (disposed) return
        const chick = visibleChicks[Math.floor(Math.random() * visibleChicks.length)]
        const useMother = Math.random() < 0.5
        setAmbient(
          useMother
            ? { mother: { line: '来抱抱～', translation: 'Come here!' }, [chick.chickId]: { line: 'Mama!', translation: '妈妈！' } }
            : { farmer: { line: '一起学习新词吧！', translation: "Let's learn!" }, [chick.chickId]: { line: 'Okay!', translation: '好呀！' } },
        )
        window.setTimeout(() => setAmbient({}), 2400)
        schedule()
      }, randomBetween(18000, 28000))
    }
    schedule()
    return () => {
      disposed = true
      window.clearTimeout(ambientTimer.current)
    }
  }, [effectiveMotion, visibleChicks])

  return (
    <>
      {specs.map(spec => {
        const chat = vm.chat?.primary.chickId === spec.id
          ? { line: vm.chat.primary.word, translation: vm.chat.primary.meaning }
          : null
        return (
          <FarmActor
            key={spec.id}
            spec={spec}
            motionEnabled={effectiveMotion}
            chat={chat}
            ambientTalk={ambient[spec.id] ?? null}
            onChat={() => {
              if (spec.kind === 'chick') dispatch({ type: 'CHICK_CHAT', chickId: spec.id, neighborIds: [] })
            }}
            onPlaced={home => {
              if (spec.kind === 'chick') dispatch({ type: 'CHICK_PLACED', chickId: spec.id, home })
            }}
          />
        )
      })}
    </>
  )
}
