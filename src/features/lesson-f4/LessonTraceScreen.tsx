import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { speak } from '../../application/services/tts'
import { f4AssetUrl } from '../farm-f4/assetUrl'
import { FarmStageShell } from '../farm-f4/visual/FarmStageShell'
import { lessonProgressPercent, type LessonIntroWord } from './lessonIntroModel'
import {
  hasMeaningfulTrace,
  toTracePoint,
  TRACE_LOGICAL_HEIGHT,
  TRACE_LOGICAL_WIDTH,
  type TracePoint,
  type TraceStroke,
} from './lessonTraceModel'
import '../../styles/f4/lesson-trace.css'

const CANVAS_SCALE = 2
const COMPLETION_PAUSE_MS = 700

export interface LessonTraceScreenProps {
  word: LessonIntroWord
  todayDone: number
  todayTotal: number
  stepIndex?: number
  stepTotal?: number
  onBack: () => void
  onComplete: (strokes: TraceStroke[]) => void
  speakText?: (text: string) => boolean
}

function SoundBars() {
  return <span className="lesson-trace-sound-f4" aria-hidden="true"><i /><i /><i /></span>
}

function drawStroke(context: CanvasRenderingContext2D, stroke: TraceStroke) {
  if (!stroke.length) return
  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = '#e77f94'
  context.fillStyle = '#e77f94'
  context.lineWidth = 10
  if (stroke.length === 1) {
    context.beginPath()
    context.arc(stroke[0].x, stroke[0].y, 4.5, 0, Math.PI * 2)
    context.fill()
    context.restore()
    return
  }
  context.beginPath()
  context.moveTo(stroke[0].x, stroke[0].y)
  for (let index = 1; index < stroke.length; index += 1) {
    const point = stroke[index]
    context.lineTo(point.x, point.y)
  }
  context.stroke()
  context.restore()
}

export function LessonTraceScreen({
  word,
  todayDone,
  todayTotal,
  stepIndex = 2,
  stepTotal = 3,
  onBack,
  onComplete,
  speakText = speak,
}: LessonTraceScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeStroke = useRef<TraceStroke | null>(null)
  const strokesRef = useRef<TraceStroke[]>([])
  const completionTimer = useRef<number | null>(null)
  const completionClock = useRef(0)
  const completionSent = useRef(false)
  const warningTimer = useRef<number | null>(null)
  const [strokes, setStrokes] = useState<TraceStroke[]>([])
  const [complete, setComplete] = useState(false)
  const [needsInk, setNeedsInk] = useState(false)
  const progress = lessonProgressPercent(todayDone, todayTotal)
  const hasInk = hasMeaningfulTrace(strokes)

  const repaint = useCallback((nextStrokes: TraceStroke[]) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0)
    context.clearRect(0, 0, TRACE_LOGICAL_WIDTH, TRACE_LOGICAL_HEIGHT)
    nextStrokes.forEach((stroke) => drawStroke(context, stroke))
  }, [])

  useEffect(() => repaint(strokes), [repaint, strokes])

  const sendCompletion = useCallback(() => {
    if (completionSent.current) return
    completionSent.current = true
    onComplete(strokesRef.current.map((stroke) => stroke.map((point) => ({ ...point }))))
  }, [onComplete])

  const cancelCompletion = useCallback(() => {
    if (completionTimer.current !== null) window.clearTimeout(completionTimer.current)
    completionTimer.current = null
    completionClock.current = 0
    completionSent.current = false
  }, [])

  useEffect(() => () => {
    if (completionTimer.current !== null) window.clearTimeout(completionTimer.current)
    if (warningTimer.current !== null) window.clearTimeout(warningTimer.current)
  }, [])

  const eventPoint = (event: PointerEvent | ReactPointerEvent<HTMLCanvasElement>): TracePoint => {
    const bounds = canvasRef.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: 1, height: 1 }
    return toTracePoint(event.clientX, event.clientY, event.timeStamp, bounds)
  }

  const beginStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    cancelCompletion()
    setComplete(false)
    setNeedsInk(false)
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = eventPoint(event)
    activeStroke.current = [point]
    repaint([...strokesRef.current, [point]])
  }

  const continueStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!activeStroke.current) return
    event.preventDefault()
    activeStroke.current.push(eventPoint(event.nativeEvent))
    repaint([...strokesRef.current, activeStroke.current])
  }

  const endStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!activeStroke.current) return
    event.preventDefault()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const next = [...strokesRef.current, activeStroke.current]
    activeStroke.current = null
    strokesRef.current = next
    setStrokes(next)
  }

  const clearInk = () => {
    cancelCompletion()
    activeStroke.current = null
    strokesRef.current = []
    setStrokes([])
    setComplete(false)
    setNeedsInk(false)
    repaint([])
  }

  const finishTrace = () => {
    if (!hasMeaningfulTrace(strokesRef.current)) {
      setNeedsInk(true)
      if (warningTimer.current !== null) window.clearTimeout(warningTimer.current)
      warningTimer.current = window.setTimeout(() => setNeedsInk(false), 480)
      return
    }
    setNeedsInk(false)
    setComplete(true)
    completionClock.current = 0
    if (completionTimer.current !== null) window.clearTimeout(completionTimer.current)
    completionTimer.current = window.setTimeout(sendCompletion, COMPLETION_PAUSE_MS)
  }

  useEffect(() => {
    const testWindow = window as Window & {
      render_game_to_text?: () => string
      advanceTime?: (ms: number) => void
    }
    testWindow.render_game_to_text = () => JSON.stringify({
      coordinateSystem: '1194x834 logical stage; trace canvas 820x295; origin top-left; x right; y down',
      screen: complete ? 'lesson_trace_complete' : 'lesson_trace_ready',
      word: word.word,
      templateVisible: !complete,
      graded: false,
      handwriting: { strokeCount: strokes.length, pointCount: strokes.reduce((sum, stroke) => sum + stroke.length, 0), meaningful: hasInk },
      progress: { done: todayDone, total: todayTotal, step: stepIndex, stepTotal },
      controls: ['back', 'replay_word', 'clear_ink', 'complete_trace'],
    })
    testWindow.advanceTime = (ms: number) => {
      if (!complete) return
      completionClock.current += Math.max(0, ms)
      if (completionClock.current >= COMPLETION_PAUSE_MS) {
        if (completionTimer.current !== null) window.clearTimeout(completionTimer.current)
        completionTimer.current = null
        sendCompletion()
      }
    }
    return () => {
      delete testWindow.render_game_to_text
      delete testWindow.advanceTime
    }
  }, [complete, hasInk, sendCompletion, stepIndex, stepTotal, strokes, todayDone, todayTotal, word.word])

  return (
    <FarmStageShell ariaLabel="皮皮のEnglish 描红练习">
      <div className="lesson-trace-f4">
        <div className="lesson-trace-wash-f4" aria-hidden="true" />
        <header className="lesson-trace-header-f4">
          <button className="lesson-trace-back-f4" type="button" onClick={onBack}><span aria-hidden="true" />回农场</button>
          <section className="lesson-trace-progress-f4" aria-label={`今日学习进度 ${todayDone} / ${todayTotal}`}>
            <div className="lesson-trace-progress-copy-f4"><strong>新朋友 · 第 {stepIndex} 步 / {stepTotal}</strong><span>今日进度 {todayDone} / {todayTotal}</span></div>
            <div className="lesson-trace-progress-path-f4">
              <span className="lesson-trace-progress-fill-f4" style={{ width: `${progress}%` }} />
              <span className="lesson-trace-progress-dot-f4 is-done" /><span className="lesson-trace-progress-dot-f4 is-current" />
              <span className="lesson-trace-progress-dot-f4" /><span className="lesson-trace-progress-dot-f4" />
            </div>
            <img className="lesson-trace-progress-hen-f4" src={f4AssetUrl('mother-f3.png')} alt="母鸡妈妈正在向终点走" />
          </section>
          <span className="lesson-trace-step-chip-f4">写一写 · 不评分</span>
        </header>

        <section className="lesson-trace-paper-f4">
          <div className="lesson-trace-title-row-f4">
            <div><p>WRITE IT ONCE</p><h1>沿着淡淡的字，写一遍</h1><span>不用写得一模一样，慢慢来就好。</span></div>
            <div className="lesson-trace-reminder-f4">
              <span><strong>{word.word}</strong><small>{word.ipa ? `${word.ipa} · ` : ''}{word.meaning}</small></span>
              <button type="button" onClick={() => speakText(word.word)} aria-label={`再次播放单词 ${word.word}`}><SoundBars />重听</button>
            </div>
          </div>

          <div className={`lesson-trace-writing-f4 ${hasInk ? 'has-ink' : ''} ${complete ? 'is-complete' : ''} ${needsInk ? 'needs-ink' : ''}`}>
            <span className="lesson-trace-pencil-tab-f4" aria-hidden="true">像蜡笔一样写</span>
            <div className="lesson-trace-lines-f4" aria-hidden="true"><i /><i /><i /><i /></div>
            <span className="lesson-trace-model-f4" aria-hidden="true">{word.word}</span>
            <canvas
              ref={canvasRef}
              className="lesson-trace-canvas-f4"
              width={TRACE_LOGICAL_WIDTH * CANVAS_SCALE}
              height={TRACE_LOGICAL_HEIGHT * CANVAS_SCALE}
              aria-label={`在淡灰字母上描写 ${word.word}`}
              onPointerDown={beginStroke}
              onPointerMove={continueStroke}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
            />
            <span className="lesson-trace-start-f4">从这里开始</span>
            <span className="lesson-trace-complete-f4" role="status">写好啦！这是你的字</span>
          </div>

          <div className="lesson-trace-actions-f4">
            <button className="lesson-trace-clear-f4" type="button" onClick={clearInk}><span aria-hidden="true">↶</span>清除重写</button>
            <p><strong>只写一遍就好</strong><span>这里不打分，也不会说你写错。</span></p>
            <button className="lesson-trace-finish-f4" type="button" onClick={finishTrace}>写好了！</button>
          </div>
        </section>
      </div>
    </FarmStageShell>
  )
}
