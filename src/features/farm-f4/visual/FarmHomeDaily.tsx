import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { CookingState } from '../../../domain/types'
import type { FarmHomeEvent, FarmHomeViewModel } from '../../../application/viewmodel'
import { f4AssetUrl } from '../assetUrl'
import { InstallHint } from '../../pwa/InstallHint'
import { FarmActors } from './FarmActors'
import '../../../styles/f4/home.css'

interface FarmHomeDailyProps {
  vm: FarmHomeViewModel
  dispatch: (event: FarmHomeEvent) => Promise<void>
}

function FeedFlight({ targetId, motionEnabled, onArrive }: {
  targetId: string
  motionEnabled: boolean
  onArrive: () => void
}) {
  const foodRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const food = foodRef.current
    const stage = food?.closest<HTMLElement>('.f4-stage')
    const target = stage?.querySelector<HTMLElement>(`[data-chick-id="${targetId}"]`)
    if (!food || !stage || !target) {
      onArrive()
      return
    }

    const stageRect = stage.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const scale = stageRect.width / 1194
    const start = { x: 850, y: 345 }
    const end = {
      x: (targetRect.left - stageRect.left + targetRect.width * 0.45) / scale,
      y: (targetRect.top - stageRect.top + targetRect.height * 0.45) / scale,
    }
    const reduced = !motionEnabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cancelled = false
    const animation = food.animate(
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)', opacity: 1 },
            { transform: `translate3d(${end.x - start.x}px, ${end.y - start.y}px, 0) scale(.48) rotate(12deg)`, opacity: 1 },
          ],
      { duration: reduced ? 140 : 1050, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' },
    )

    animation.finished.then(() => {
      if (cancelled) return
      target.classList.add('feed-celebrate')
      window.setTimeout(() => target.classList.remove('feed-celebrate'), reduced ? 350 : 1500)
      onArrive()
    }).catch(() => undefined)

    return () => {
      cancelled = true
      animation.cancel()
    }
  }, [motionEnabled, onArrive, targetId])

  return (
    <>
      <img ref={foodRef} className="flying-food-f4" src={f4AssetUrl('fried-egg-f4.png')} alt="" />
      <span className="f4-sr-only" role="status">正在把煎蛋送给小鸡</span>
    </>
  )
}

function EggPanel({ vm, dispatch, onFeed }: FarmHomeDailyProps & { onFeed: () => Promise<void> }) {
  const [showCook, setShowCook] = useState(vm.cooking !== 'empty')
  const [frying, setFrying] = useState(false)
  const [feedback, setFeedback] = useState('')
  const fryTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (vm.cooking !== 'empty') setShowCook(true)
  }, [vm.cooking])

  useEffect(() => () => window.clearTimeout(fryTimer.current), [])

  if (vm.overlay !== 'egg_panel') return null

  const state: CookingState = frying ? 'cooking' : vm.cooking
  const emptySlots = 3 - vm.incubating.length
  const kitchenCopy =
    state === 'raw'
      ? '鸡蛋已经进锅啦，点一下开火。'
      : state === 'cooking'
        ? '滋滋～等蛋白变成漂亮的奶油色。'
        : state === 'ready'
          ? vm.chicksTotal > 0 ? '煎好啦！把今天的奖励分享给一只小鸡。' : '先留在锅里吧，等第一只小鸡破壳就能分享给它。'
          : '锅还是空的。要拿一颗鸡蛋来煎吗？'
  const kitchenAction =
    state === 'raw'
      ? '开火，慢慢煎一煎'
      : state === 'cooking'
        ? '正在煎蛋…'
        : state === 'ready'
          ? '喂给一只小鸡'
          : '放一颗鸡蛋进锅里'

  const runKitchenAction = async () => {
    if (state === 'empty') {
      if (vm.eggStock === 0) return
      await dispatch({ type: 'PUT_EGG_IN_PAN' })
      return
    }
    if (state === 'raw') {
      setFrying(true)
      await dispatch({ type: 'START_FRYING' })
      fryTimer.current = window.setTimeout(async () => {
        await dispatch({ type: 'FRYING_DONE' })
        setFrying(false)
      }, 1900)
      return
    }
    if (state === 'ready') {
      await onFeed()
      setShowCook(false)
    }
  }

  return (
    <>
      <button
        className="panel-backdrop-f4"
        type="button"
        aria-label="关闭鸡蛋篮"
        onClick={() => dispatch({ type: 'CLOSE_EGG_PANEL' })}
      />
      <section className={`kitchen-panel-f4 egg-panel-f4 is-${state}`} aria-labelledby="egg-panel-title-f4">
        <button className="panel-close-f4" type="button" aria-label="关闭鸡蛋篮" onClick={() => dispatch({ type: 'CLOSE_EGG_PANEL' })}>×</button>
        <p className="k-eyebrow">小皮的鸡蛋篮</p>
        <h2 id="egg-panel-title-f4">鸡蛋要怎么用？</h2>
        <div className="egg-balance-f4"><img src={f4AssetUrl('egg-f4-v2.png')} alt="" />剩余 <strong>{vm.eggStock}</strong> 颗</div>

        {!showCook && state === 'empty' ? (
          <div className="egg-choice-view-f4">
            <p>每颗鸡蛋只能选择一种用途，由你来安排。</p>
            <div className="egg-choice-grid-f4">
              <button
                type="button"
                disabled={vm.eggStock === 0 || emptySlots === 0}
                onClick={async () => {
                  await dispatch({ type: 'ALLOCATE_EGG_TO_HATCH' })
                  setFeedback(emptySlots > 1 ? `放好啦！还剩 ${emptySlots - 1} 个空巢位。` : '放好啦！三个巢位都住满了。')
                }}
              >
                <img src={f4AssetUrl('hatchery-empty-f4.png')} alt="" />
                <span><strong>拿去孵化</strong><small>{emptySlots > 0 ? `还有 ${emptySlots} 个空巢位` : '三个巢位都住满了'}</small></span>
              </button>
              <button type="button" disabled={vm.eggStock === 0} onClick={() => setShowCook(true)}>
                <img src={f4AssetUrl('fried-egg-f4.png')} alt="" />
                <span><strong>煎鸡蛋</strong><small>做好后喂一只小鸡</small></span>
              </button>
            </div>
            <p className="egg-feedback-f4" aria-live="polite">{feedback || (vm.eggStock === 0 ? '完成今天的学习，就能得到新的鸡蛋。' : '')}</p>
          </div>
        ) : (
          <div className="cook-view-f4">
            <button className="back-choice-f4" type="button" disabled={state !== 'empty'} onClick={() => setShowCook(false)}>← 重新选择用途</button>
            <h3>煎一颗蛋喂小鸡</h3>
            <div className="kitchen-worktop-f4">
              <img className="kitchen-panel-image-f4" src={f4AssetUrl('kitchen-f4.png')} alt="空平底锅" />
              <img className="pan-egg-f4 pan-egg-raw-f4" src={f4AssetUrl('egg-f4-v2.png')} alt="锅里的生鸡蛋" />
              <img className="pan-egg-f4 pan-egg-fried-f4" src={f4AssetUrl('fried-egg-f4.png')} alt="煎好的鸡蛋" />
              <span className="pan-sizzle-f4">滋滋～</span>
            </div>
            <p className="kitchen-copy-f4">{kitchenCopy}</p>
            <button className="k-button kitchen-action-f4" type="button" disabled={state === 'cooking' || (state === 'empty' && vm.eggStock === 0) || (state === 'ready' && vm.chicksTotal === 0)} onClick={runKitchenAction}>{state === 'ready' && vm.chicksTotal === 0 ? '等小鸡破壳' : kitchenAction}</button>
            <small>关闭面板后，锅里的进度会保留。</small>
          </div>
        )}
      </section>
    </>
  )
}

function FirstVisitBoard({ dispatch }: Pick<FarmHomeDailyProps, 'dispatch'>) {
  const [name, setName] = useState('')
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submitName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setFeedback('先写下一个名字吧。')
      return
    }
    setSubmitting(true)
    setFeedback('')
    try {
      await dispatch({ type: 'NAME_HEN', name: trimmed })
    } catch {
      setSubmitting(false)
      setFeedback('刚才没有保存好，再试一次吧。')
    }
  }

  return (
    <section className="name-board-f4" aria-labelledby="name-title-f4">
      <span className="name-board-pin-f4" aria-hidden="true" />
      <p className="k-eyebrow">欢迎来到小鸡农场</p>
      <h1 id="name-title-f4">给母鸡妈妈起个名字吧</h1>
      <p>以后她会陪你认识新单词，也会在农场里等你回来。</p>
      <form onSubmit={submitName}>
        <label htmlFor="hen-name-f4">她叫什么名字？</label>
        <div className="name-input-row-f4">
          <input
            id="hen-name-f4"
            value={name}
            maxLength={8}
            autoComplete="off"
            enterKeyHint="done"
            placeholder="写一个名字"
            aria-describedby="name-feedback-f4"
            onChange={event => {
              setName(event.target.value)
              if (feedback) setFeedback('')
            }}
          />
          <button className="k-button" type="submit" disabled={submitting}>就叫这个！</button>
        </div>
        <small id="name-feedback-f4" role="status">{feedback || '最多 8 个字，想好了就告诉她。'}</small>
      </form>
    </section>
  )
}

function CompleteBoard({ vm, dispatch }: FarmHomeDailyProps) {
  const completedNewWords = vm.state === 'daily_complete' ? vm.dailyTarget : vm.newWordsLearnedToday
  return (
    <section className="complete-board-f4" aria-labelledby="complete-title-f4">
      <div className="complete-ribbon-f4">TODAY · DONE</div>
      <p className="complete-kicker-f4">今天的农场任务完成啦</p>
      <h1 id="complete-title-f4">连续 {vm.streak} 天！</h1>
      <p>今天认识了 {completedNewWords} 个新朋友，还复习了 {vm.reviewCountToday} 个老朋友。</p>
      <div className="complete-stats-f4" aria-label="今日学习战报">
        <span><strong>{completedNewWords}</strong> 新词</span>
        <span><strong>{vm.reviewCountToday}</strong> 复习</span>
        <span><strong>+{vm.eggsEarnedToday}</strong> 鸡蛋</span>
      </div>
      <button className="handwriting-sign-f4" type="button" onClick={() => dispatch({ type: 'OPEN_HANDWRITING_GAME' })}>
        <span>✎</span>
        <strong>玩一轮写词游戏</strong>
        <small>10 题 · 完成可得鸡蛋</small>
      </button>
    </section>
  )
}

export function FarmHomeDaily({ vm, dispatch }: FarmHomeDailyProps) {
  const [feedingTargetId, setFeedingTargetId] = useState<string | null>(null)
  const emptySlots = 3 - vm.incubating.length
  const progress = vm.totalItemsToday > 0 ? Math.min(100, (vm.learnedToday / vm.totalItemsToday) * 100) : 0
  const taskTitle = vm.newWordsPaused
    ? '今天先复习老朋友'
    : vm.learnedToday > 0 ? '继续今天的学习' : '开始今天的学习'
  const taskSummary = vm.newWordsPaused
    ? `复习 ${vm.reviewCountToday} 个`
    : vm.reviewCountToday > 0
      ? `复习 ${vm.reviewCountToday} · 新词 ${vm.dailyTarget}`
      : `新词 ${vm.dailyTarget} 个`
  const hatcheryCopy = emptySlots > 0
    ? `蛋会各自在巢里轻轻晃动，还可以放入 ${emptySlots} 颗。`
    : '三个巢位都住进了小鸡宝宝，耐心等它们破壳吧。'

  const startFeeding = async () => {
    const candidates = vm.chicksVisible.slice(0, 6)
    if (candidates.length === 0 || feedingTargetId) return
    const target = candidates[Math.floor(Math.random() * candidates.length)]
    await dispatch({ type: 'CLOSE_EGG_PANEL' })
    setFeedingTargetId(target.chickId)
  }

  const finishFeeding = useCallback(() => {
    if (!feedingTargetId) return
    const targetId = feedingTargetId
    setFeedingTargetId(null)
    dispatch({ type: 'FEED_CHICK', chickId: targetId })
  }, [dispatch, feedingTargetId])

  return (
    <div className={`f4-home farm-app-f3 farm-app-f4 ${vm.motionEnabled ? '' : 'motion-paused'}`}>
      <header className="sticker-topbar">
        <div className="sticker-brand">
          <span className="brand-face" aria-hidden="true"><img src={f4AssetUrl('chick-f3.png')} alt="" /></span>
          <span>皮皮のEnglish</span>
        </div>
        {vm.state !== 'first_visit' && <>
          <button className="sticker-chip egg-stock-f4" type="button" aria-label={`剩余鸡蛋 ${vm.eggStock} 颗，选择孵化或煎蛋`} onClick={() => dispatch({ type: 'OPEN_EGG_PANEL' })}>
            <img src={f4AssetUrl('egg-f4-v2.png')} alt="" /><span>鸡蛋</span><strong>{vm.eggStock}</strong>
          </button>
          <div className="sticker-chip">小鸡 <strong>{vm.chicksTotal}</strong></div>
        </>}
        <button className="sticker-chip motion-toggle" type="button" aria-pressed={!vm.motionEnabled} onClick={() => dispatch({ type: 'SET_MOTION', enabled: !vm.motionEnabled })}>动效：{vm.motionEnabled ? '开' : '关'}</button>
        <button className="parent-button" type="button" onClick={() => dispatch({ type: 'OPEN_PARENT' })}>家长</button>
      </header>

      <InstallHint />

      <section className="farm-stage-f3 farm-stage-f4" aria-label="会慢慢散步和生活互动的农场">
        {vm.state === 'first_visit' ? <FirstVisitBoard dispatch={dispatch} /> : vm.state === 'daily_complete' ? <CompleteBoard vm={vm} dispatch={dispatch} /> : <section className="task-board-f3" aria-labelledby="task-title-f4">
          <p className="k-eyebrow">DAY {String(vm.dayNumber).padStart(2, '0')} · 今日任务</p>
          <h1 id="task-title-f4">{taskTitle}</h1>
          <div className="task-summary-f4"><span>{taskSummary}</span><span>约 {vm.estimatedMinutes} 分钟</span></div>
          <div className="progress-line">
            <span>已完成</span>
            <span className="progress-track"><span style={{ width: `${progress}%` }} /></span>
            <strong>{vm.learnedToday} / {vm.totalItemsToday}</strong>
          </div>
          <button className="k-button" type="button" onClick={() => dispatch({ type: 'START_DAILY_LESSON' })}>{vm.learnedToday > 0 ? '继续学习' : '开始学习'}</button>
        </section>}

        {vm.state !== 'first_visit' && <section className={`hatchery-wrap-f4 ${vm.overlay === 'hatchery_pop' ? 'is-open' : ''}`} aria-label="鸡蛋孵化区">
          <button className="hatchery-button-f4" type="button" aria-expanded={vm.overlay === 'hatchery_pop'} onClick={() => dispatch({ type: 'TOGGLE_HATCHERY_POP' })}>
            <img className="hatchery-base-f4" src={f4AssetUrl('hatchery-empty-f4.png')} alt="有三个独立巢位的孵化小屋" />
            {[0, 1, 2].map(slot => {
              const active = vm.incubating.some(egg => egg.slot === slot)
              return <img key={slot} className={`hatchery-egg-f4 ${active ? 'is-incubating' : ''}`} data-egg-slot={slot} src={f4AssetUrl('egg-f4-v2.png')} alt={active ? '正在孵化的鸡蛋' : ''} />
            })}
            <span className="hatchery-status-f4"><strong>孵化小屋 · {vm.incubating.length} 颗孵化中</strong></span>
          </button>
          <div className="hatchery-pop-f4">
            <strong>给新小鸡留一个位置</strong>
            <p>{hatcheryCopy}</p>
            <button type="button" disabled={vm.eggStock === 0 || emptySlots === 0} onClick={() => dispatch({ type: 'ALLOCATE_EGG_TO_HATCH' })}>
              {emptySlots === 0 ? '孵化位已满' : vm.eggStock === 0 ? '没有剩余鸡蛋' : '放入一颗鸡蛋孵化'}
            </button>
          </div>
        </section>}

        {vm.state !== 'first_visit' && <section className={`rescue-wrap-f4 ${vm.overlay === 'rescue_pop' ? 'is-open' : ''}`} aria-label="等待救援的小鸡">
          <button className="rescue-entry-f4" type="button" aria-expanded={vm.overlay === 'rescue_pop'} onClick={() => dispatch({ type: 'TOGGLE_RESCUE_POP' })}>
            <img src={f4AssetUrl('rescue-basket-f4.png')} alt="在篮子里安全探头、等待救援的小鸡" />
            <span>待救 ×{vm.rescueCount}</span>
          </button>
          <div className="rescue-pop-f4">
            <strong>有 {vm.rescueCount} 只小鸡等你接回家</strong>
            <p>完成错词补练，它们就会开开心心回到农场。</p>
            <button type="button" disabled={vm.rescueCount === 0} onClick={() => dispatch({ type: 'OPEN_RESCUE' })}>去救援</button>
          </div>
        </section>}

        <FarmActors vm={vm} dispatch={dispatch} />
        {vm.state !== 'first_visit' && <EggPanel vm={vm} dispatch={dispatch} onFeed={startFeeding} />}
        {feedingTargetId && <FeedFlight targetId={feedingTargetId} motionEnabled={vm.motionEnabled} onArrive={finishFeeding} />}
      </section>
    </div>
  )
}
