import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { RecipeId } from '../../../domain/meals'
import type { FarmHomeEvent, FarmHomeViewModel } from '../../../application/viewmodel'
import { f4AssetUrl } from '../assetUrl'
import { approvedBgmTrack } from '../audio/bgmTracks'
import { InstallHint } from '../../pwa/InstallHint'
import { FarmActors } from './FarmActors'
import {
  CustomizationEntrances,
  DecorationCatalogPanel,
  FarmDecorations,
  WardrobePanel,
} from './FarmCustomization'
import '../../../styles/f4/home.css'

interface FarmHomeDailyProps {
  vm: FarmHomeViewModel
  dispatch: (event: FarmHomeEvent) => Promise<void>
}

export function friendlyHatchRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return '马上就要破壳啦'
  const hourMs = 60 * 60 * 1000
  if (remainingMs >= hourMs) return `约 ${Math.ceil(remainingMs / hourMs)} 小时`
  return `约 ${Math.max(1, Math.ceil(remainingMs / 60_000))} 分钟`
}

export function chapterCelebrationTravelLabel(nextTravelScene: FarmHomeViewModel['nextTravelScene']): string {
  return nextTravelScene ? `先去第 ${nextTravelScene.chapter} 章` : '现在出发'
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

const RECIPE_COPY: Record<RecipeId, { title: string; summary: string }> = {
  single_fried_egg: { title: '单份煎蛋', summary: '选一只当前场景小鸡分享' },
  picnic_platter: { title: '野餐餐盘', summary: '当前场景的小鸡一起聚餐' },
  celebration_feast: { title: '庆典大餐', summary: '全场庆祝，本章首次留下合照' },
}

function EggPanel({ vm, dispatch, onFeed }: FarmHomeDailyProps & { onFeed: (chickId: string) => Promise<void> }) {
  const [showCook, setShowCook] = useState(vm.cookingMeal !== null)
  const [frying, setFrying] = useState(false)
  const [feedback, setFeedback] = useState('')
  const fryTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (vm.cookingMeal !== null) setShowCook(true)
  }, [vm.cookingMeal])

  useEffect(() => () => window.clearTimeout(fryTimer.current), [])

  if (vm.overlay !== 'egg_panel') return null

  const meal = vm.cookingMeal
  const state: 'empty' | 'raw' | 'cooking' | 'ready' = frying ? 'cooking' : meal?.phase ?? 'empty'
  const nestAvailable = vm.incubating === null
  const recipeCopy = meal ? RECIPE_COPY[meal.recipeId] : null
  const kitchenCopy =
    state === 'raw'
      ? `${recipeCopy?.title ?? '料理'}已经备好，点一下开始制作。`
      : state === 'cooking'
        ? '滋滋～这一份会一次做好，不用重复煎蛋。'
        : state === 'ready'
          ? `${recipeCopy?.title ?? '料理'}做好啦，现在可以享用。`
          : '选择一份料理，鸡蛋会在开始时一次扣除。'

  const startCookingAnimation = async () => {
    if (state !== 'raw' || frying) return
    setFrying(true)
    fryTimer.current = window.setTimeout(async () => {
      await dispatch({ type: 'COOKING_DONE' })
      setFrying(false)
    }, vm.motionEnabled ? 1900 : 180)
  }

  const serveGroup = async () => {
    if (!meal || meal.recipeId === 'single_fried_egg' || meal.phase !== 'ready') return
    await dispatch({ type: 'SERVE_GROUP' })
    setFeedback(meal.recipeId === 'celebration_feast' ? '庆典开始啦！章节合照会永久留在回忆里。' : '大家一起开开心心野餐啦！')
    setShowCook(false)
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

        {!showCook && meal === null ? (
          <div className="egg-choice-view-f4">
            <p>每颗鸡蛋只能选择一种用途，由你来安排。</p>
            <div className="egg-choice-grid-f4">
              <button
                type="button"
                disabled={vm.eggStock === 0 || !nestAvailable}
                onClick={async () => {
                  await dispatch({ type: 'ALLOCATE_EGG_TO_HATCH' })
                  setFeedback('放好啦！小鸡宝宝会在这个巢里慢慢长大。')
                }}
              >
                <img src={f4AssetUrl('egg-f4-v2.png')} alt="" />
                <span><strong>拿去孵化</strong><small>{nestAvailable ? '唯一的巢位正在等一颗蛋' : '小鸡宝宝正在慢慢长大'}</small></span>
              </button>
              <button type="button" disabled={vm.chicksTotal === 0} onClick={() => setShowCook(true)}>
                <img src={f4AssetUrl('fried-egg-f4.png')} alt="" />
                <span><strong>去厨房</strong><small>{vm.chicksTotal === 0 ? '有小鸡后就能一起做料理' : '单份、野餐或庆典大餐'}</small></span>
              </button>
            </div>
            <p className="egg-feedback-f4" aria-live="polite">{feedback || (vm.eggStock === 0 ? '完成今天的学习，就能得到新的鸡蛋。' : '')}</p>
          </div>
        ) : (
          <div className="cook-view-f4">
            <button className="back-choice-f4" type="button" disabled={meal !== null} onClick={() => setShowCook(false)}>← 重新选择用途</button>
            {meal === null ? (
              <>
                <h3>今天想做哪一份？</h3>
                <p className="kitchen-copy-f4">{kitchenCopy}</p>
                <div className="recipe-grid-f4">
                  {vm.availableRecipes.map(recipe => (
                    <button
                      key={recipe.recipeId}
                      type="button"
                      disabled={!recipe.enabled}
                      onClick={() => dispatch({ type: 'START_RECIPE', recipeId: recipe.recipeId })}
                    >
                      <strong>{RECIPE_COPY[recipe.recipeId].title} · {recipe.eggCost} 蛋</strong>
                      <small>{RECIPE_COPY[recipe.recipeId].summary}</small>
                    </button>
                  ))}
                </div>
                <small>{vm.chicksTotal === 0 ? '当前场景还没有小鸡，暂时不能开始料理。' : '余额不足的料理会安静地等下一颗蛋。'}</small>
              </>
            ) : (
              <>
                <h3>{recipeCopy?.title}</h3>
                <div className="kitchen-worktop-f4">
                  <img className="kitchen-panel-image-f4" src={f4AssetUrl('kitchen-f4.png')} alt="料理中的平底锅" />
                  <img className="pan-egg-f4 pan-egg-raw-f4" src={f4AssetUrl('egg-f4-v2.png')} alt="准备制作的鸡蛋" />
                  <img className="pan-egg-f4 pan-egg-fried-f4" src={f4AssetUrl('fried-egg-f4.png')} alt="做好的料理" />
                  <span className="pan-sizzle-f4">滋滋～</span>
                </div>
                <p className="kitchen-copy-f4">{kitchenCopy}</p>
                {state === 'raw' && <button className="k-button kitchen-action-f4" type="button" onClick={startCookingAnimation}>开始制作</button>}
                {state === 'cooking' && <button className="k-button kitchen-action-f4" type="button" disabled>正在制作…</button>}
                {state === 'ready' && meal.recipeId === 'single_fried_egg' && (
                  <div className="meal-chick-picker-f4" aria-label="选择享用单份煎蛋的小鸡">
                    <strong>选一只小鸡来享用</strong>
                    <div>{vm.chicksVisible.slice(0, 8).map((chick, index) => (
                      <button key={chick.chickId} type="button" onClick={() => onFeed(chick.chickId)}>小鸡 {index + 1}</button>
                    ))}</div>
                  </div>
                )}
                {state === 'ready' && meal.recipeId !== 'single_fried_egg' && <button className="k-button kitchen-action-f4" type="button" onClick={serveGroup}>大家一起享用</button>}
                <small>关闭面板后，raw / ready 状态都会安全保留，不会再次扣蛋。</small>
              </>
            )}
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

function CoopPanel({ vm, dispatch }: FarmHomeDailyProps) {
  if (vm.overlay !== 'coop') return null
  const visibleIds = new Set(vm.chicksVisible.map(chick => chick.chickId))
  const capturedIds = new Set(vm.chicksCaptured.map(chick => chick.chickId))

  return (
    <>
      <button className="panel-backdrop-f4" type="button" aria-label="关闭鸡舍" onClick={() => dispatch({ type: 'CLOSE_COOP' })} />
      <section className="coop-panel-f4" aria-labelledby="coop-title-f4">
        <button className="panel-close-f4" type="button" aria-label="关闭鸡舍" onClick={() => dispatch({ type: 'CLOSE_COOP' })}>×</button>
        <p className="k-eyebrow">{vm.viewedScene.title} · 全部居民</p>
        <h2 id="coop-title-f4">小鸡鸡舍</h2>
        <p className="coop-summary-f4">这里一只也不会丢。最喜欢 {vm.favoriteCount} / 8，农场外休息 {vm.chicksInCoop} 只{vm.chicksCaptured.length > 0 ? `，${vm.chicksCaptured.length} 只在篮子里等你` : ''}。</p>
        <div className="coop-list-f4">
          {vm.chicksAll.map((chick, index) => {
            const visible = visibleIds.has(chick.chickId)
            const captured = capturedIds.has(chick.chickId)
            const speaking = vm.chat?.primary.chickId === chick.chickId
            return (
              <article className={`coop-chick-f4 ${chick.favorite ? 'is-favorite' : ''} ${captured ? 'is-captured' : ''}`} key={chick.chickId}>
                <img src={f4AssetUrl('chick-f3.png')} alt="" />
                <span className="coop-chick-copy-f4">
                  <strong>小鸡 {index + 1}</strong>
                  <small>{captured ? '在篮子里等你来接' : chick.favorite ? '★ 最喜欢 · 农场常驻' : visible ? '正在农场散步' : '正在鸡舍休息'}</small>
                  {speaking && <em>{vm.chat!.primary.word} · {vm.chat!.primary.meaning}</em>}
                </span>
                <button type="button" onClick={() => dispatch({ type: 'CHICK_CHAT', chickId: chick.chickId, neighborIds: [] })}>说单词</button>
                <button
                  className={`coop-star-f4 ${chick.favorite ? 'is-favorite' : ''}`}
                  type="button"
                  aria-pressed={chick.favorite}
                  onClick={() => dispatch({ type: 'TOGGLE_CHICK_FAVORITE', chickId: chick.chickId })}
                >{chick.favorite ? '★ 取消最喜欢' : visible ? '☆ 加入最喜欢' : '☆ 换回农场'}</button>
              </article>
            )
          })}
          {vm.chicksAll.length === 0 && <p className="coop-empty-f4">第一只小鸡破壳后，就会住进这里。</p>}
        </div>

        {vm.favoriteReplacement && (
          <section className="favorite-replace-f4" role="dialog" aria-modal="true" aria-labelledby="favorite-replace-title-f4">
            <h3 id="favorite-replace-title-f4">8 个位置已经满啦</h3>
            <p>选择一只最喜欢来交换；也可以取消，什么都不会改变。</p>
            <div>
              {vm.favoriteReplacement.candidates.map((chick, index) => (
                <button key={chick.chickId} type="button" onClick={() => dispatch({ type: 'REPLACE_FAVORITE_CHICK', replaceChickId: chick.chickId })}>
                  <img src={f4AssetUrl('chick-f3.png')} alt="" />替换小鸡 {index + 1}
                </button>
              ))}
            </div>
            <button className="favorite-cancel-f4" type="button" onClick={() => dispatch({ type: 'CANCEL_FAVORITE_REPLACEMENT' })}>先不换</button>
          </section>
        )}
      </section>
    </>
  )
}

function SceneMapPanel({ vm, dispatch }: FarmHomeDailyProps) {
  if (vm.overlay !== 'map') return null
  return (
    <>
      <button className="panel-backdrop-f4" type="button" aria-label="关闭章节地图" onClick={() => dispatch({ type: 'CLOSE_SCENE_MAP' })} />
      <section className="scene-map-panel-f4" aria-labelledby="scene-map-title-f4">
        <button className="panel-close-f4" type="button" aria-label="关闭章节地图" onClick={() => dispatch({ type: 'CLOSE_SCENE_MAP' })}>×</button>
        <p className="k-eyebrow">长期农场 · 旅行地图</p>
        <h2 id="scene-map-title-f4">走过的地方都在这里</h2>
        <p>旧场景可以随时回去看看；真正的旅程仍留在“当前旅程”场景。</p>
        <div className="scene-map-list-f4">
          {vm.sceneMap.map(scene => (
            <article className={`scene-map-node-f4 ${scene.active ? 'is-active' : ''} ${scene.viewed ? 'is-viewed' : ''}`} key={scene.id}>
              <img src={f4AssetUrl(scene.thumbnailAssetId)} alt="" />
              <span><small>第 {scene.chapter} 章</small><strong>{scene.title}</strong><em>{scene.subtitle}</em></span>
              {scene.active ? <b>当前旅程</b> : scene.visitEnabled ? (
                <button type="button" onClick={() => dispatch({ type: 'VISIT_SCENE', sceneId: scene.id })}>回去看看</button>
              ) : scene.travelEnabled ? (
                <button type="button" onClick={() => dispatch({ type: 'TRAVEL_TO_NEXT_SCENE' })}>现在出发</button>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

function ChapterCelebrationPanel({ vm, dispatch }: FarmHomeDailyProps) {
  if (vm.overlay !== 'chapter_celebration' || !vm.pendingCelebrationScene) return null
  const scene = vm.pendingCelebrationScene
  return (
    <>
      <span className="panel-backdrop-f4" aria-hidden="true" />
      <section className="chapter-celebration-f4" role="dialog" aria-modal="true" aria-labelledby="chapter-celebration-title-f4">
        <p className="k-eyebrow">第 {scene.chapter} 章 · 免费解锁</p>
        <img src={f4AssetUrl(scene.thumbnailAssetId)} alt="" />
        <h2 id="chapter-celebration-title-f4">{scene.title}在前面等你啦！</h2>
        <p>{scene.subtitle}。什么时候出发都可以，留下来也不会失去任何东西。</p>
        <div>
          <button className="k-button" type="button" onClick={() => dispatch({ type: 'TRAVEL_TO_NEXT_SCENE' })}>
            {chapterCelebrationTravelLabel(vm.nextTravelScene)}
          </button>
          <button type="button" onClick={() => dispatch({ type: 'STAY_IN_CURRENT_SCENE', chapter: scene.chapter })}>再住一阵子</button>
        </div>
      </section>
    </>
  )
}

function TravelMealPrompt({ vm, dispatch }: FarmHomeDailyProps) {
  if (vm.overlay !== 'travel_meal_prompt' || !vm.cookingMeal) return null
  return (
    <>
      <span className="panel-backdrop-f4" aria-hidden="true" />
      <section className="travel-meal-prompt-f4" role="dialog" aria-modal="true" aria-labelledby="travel-meal-title-f4">
        <p className="k-eyebrow">出发前的小提醒</p>
        <h2 id="travel-meal-title-f4">锅里还有准备好的料理</h2>
        <p>要先享用，还是收好鸡蛋再出发？收好时会把 {vm.cookingMeal.eggCost} 颗鸡蛋全部放回篮子。</p>
        <div>
          <button type="button" onClick={() => dispatch({ type: 'RESOLVE_TRAVEL_MEAL', choice: 'serve_first' })}>先去享用</button>
          <button className="k-button" type="button" onClick={() => dispatch({ type: 'RESOLVE_TRAVEL_MEAL', choice: 'refund' })}>收好再出发</button>
        </div>
      </section>
    </>
  )
}

export function FarmHomeDaily({ vm, dispatch }: FarmHomeDailyProps) {
  const [feedingTargetId, setFeedingTargetId] = useState<string | null>(null)
  const nestAvailable = vm.incubating === null
  const progress = vm.totalItemsToday > 0 ? Math.min(100, (vm.learnedToday / vm.totalItemsToday) * 100) : 0
  const taskTitle = vm.newWordsPaused
    ? '今天先复习老朋友'
    : vm.learnedToday > 0 ? '继续今天的学习' : '开始今天的学习'
  const taskSummary = vm.newWordsPaused
    ? `复习 ${vm.reviewCountToday} 个`
    : vm.reviewCountToday > 0
      ? `复习 ${vm.reviewCountToday} · 新词 ${vm.dailyTarget}`
      : `新词 ${vm.dailyTarget} 个`
  const hatcheryCopy = nestAvailable
    ? '放进一颗鸡蛋，明天会认识一只新朋友。'
    : '小鸡宝宝正在里面慢慢长大。'
  const hatchRemaining = vm.incubating ? friendlyHatchRemaining(vm.incubating.remainingMs) : null
  const currentJourney = vm.sceneCapabilities.learning

  const startFeeding = async (chickId: string) => {
    if (!vm.chicksVisible.some(chick => chick.chickId === chickId) || feedingTargetId) return
    await dispatch({ type: 'CLOSE_EGG_PANEL' })
    setFeedingTargetId(chickId)
  }

  const finishFeeding = useCallback(() => {
    if (!feedingTargetId) return
    const targetId = feedingTargetId
    setFeedingTargetId(null)
    dispatch({ type: 'SERVE_SINGLE', chickId: targetId })
  }, [dispatch, feedingTargetId])

  return (
    <div className={`f4-home farm-app-f3 farm-app-f4 ${vm.motionEnabled ? '' : 'motion-paused'}`}>
      <header className="sticker-topbar">
        <div className="sticker-brand">
          <span className="brand-face" aria-hidden="true"><img src={f4AssetUrl('chick-f3.png')} alt="" /></span>
          <span>皮皮のEnglish</span>
        </div>
        <button className="sticker-chip scene-map-chip-f4" type="button" onClick={() => dispatch({ type: 'OPEN_SCENE_MAP' })}>
          地图 · {vm.viewedScene.title}
        </button>
        {vm.state !== 'first_visit' && <>
          {currentJourney ? <button className="sticker-chip egg-stock-f4" type="button" aria-label={`剩余鸡蛋 ${vm.eggStock} 颗，选择孵化或料理`} onClick={() => dispatch({ type: 'OPEN_EGG_PANEL' })}>
            <img src={f4AssetUrl('egg-f4-v2.png')} alt="" /><span>鸡蛋</span><strong>{vm.eggStock}</strong>
          </button> : <span className="sticker-chip"><span>鸡蛋</span><strong>{vm.eggStock}</strong></span>}
          <div className="sticker-chip">小鸡 <strong>{vm.chicksTotal}</strong></div>
          <button className="sticker-chip coop-chip-f4" type="button" onClick={() => dispatch({ type: 'OPEN_COOP' })}>鸡舍 <strong>×{vm.chicksInCoop}</strong></button>
        </>}
        <button className="sticker-chip motion-toggle" type="button" aria-pressed={!vm.motionEnabled} onClick={() => dispatch({ type: 'SET_MOTION', enabled: !vm.motionEnabled })}>动效：{vm.motionEnabled ? '开' : '关'}</button>
        {approvedBgmTrack() && <button className="sticker-chip motion-toggle" type="button" aria-pressed={!vm.musicEnabled} onClick={() => dispatch({ type: 'SET_MUSIC', enabled: !vm.musicEnabled })}>音乐：{vm.musicEnabled ? '开' : '关'}</button>}
        <button className="parent-button" type="button" onClick={() => dispatch({ type: 'OPEN_PARENT' })}>家长</button>
      </header>

      <InstallHint />

      <section className="farm-stage-f3 farm-stage-f4" aria-label="会慢慢散步和生活互动的农场">
        {!currentJourney ? <section className="return-journey-board-f4" aria-labelledby="return-journey-title-f4">
          <p className="k-eyebrow">正在回访 · 第 {vm.viewedScene.chapter} 章</p>
          <h1 id="return-journey-title-f4">{vm.viewedScene.title}</h1>
          <p>这里可以看小鸡、听单词和打开鸡舍。今天的学习、孵化和厨房都留在当前旅程。</p>
          <button className="k-button" type="button" onClick={() => dispatch({ type: 'RETURN_ACTIVE_SCENE' })}>回到当前旅程 · {vm.activeScene.title}</button>
        </section> : vm.state === 'first_visit' ? <FirstVisitBoard dispatch={dispatch} /> : vm.state === 'daily_complete' ? <CompleteBoard vm={vm} dispatch={dispatch} /> : <section className="task-board-f3" aria-labelledby="task-title-f4">
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

        {currentJourney && vm.state !== 'first_visit' && <section className={`hatchery-wrap-f4 ${vm.overlay === 'hatchery_pop' ? 'is-open' : ''}`} aria-label="鸡蛋孵化区">
          <button className="hatchery-button-f4" type="button" aria-expanded={vm.overlay === 'hatchery_pop'} onClick={() => dispatch({ type: 'TOGGLE_HATCHERY_POP' })}>
            <span className="single-nest-f4" aria-hidden="true" />
            <img className={`hatchery-egg-f4 ${vm.incubating ? 'is-incubating' : ''}`} src={f4AssetUrl('egg-f4-v2.png')} alt={vm.incubating ? '正在唯一巢位里孵化的鸡蛋' : ''} />
            <span className="hatchery-status-f4"><strong>{hatchRemaining ? `孵化小屋 · 还要 ${hatchRemaining}` : '孵化小屋 · 等一颗鸡蛋'}</strong></span>
          </button>
          <div className="hatchery-pop-f4">
            <strong>给新小鸡留一个位置</strong>
            <p>{hatcheryCopy}</p>
            <button type="button" disabled={vm.eggStock === 0 || !nestAvailable} onClick={() => dispatch({ type: 'ALLOCATE_EGG_TO_HATCH' })}>
              {!nestAvailable ? '小鸡宝宝正在长大' : vm.eggStock === 0 ? '没有剩余鸡蛋' : '放入一颗鸡蛋孵化'}
            </button>
          </div>
        </section>}

        {currentJourney && vm.state !== 'first_visit' && <section className={`rescue-wrap-f4 ${vm.overlay === 'rescue_pop' ? 'is-open' : ''}`} aria-label="等待救援的小鸡">
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

        <FarmDecorations vm={vm} layer="back" dispatch={dispatch} />
        <FarmDecorations vm={vm} layer="actor" dispatch={dispatch} />
        <FarmActors vm={vm} dispatch={dispatch} />
        <FarmDecorations vm={vm} layer="front" dispatch={dispatch} />
        {vm.state !== 'first_visit' && <CustomizationEntrances vm={vm} dispatch={dispatch} />}
        {currentJourney && vm.state !== 'first_visit' && <EggPanel vm={vm} dispatch={dispatch} onFeed={startFeeding} />}
        {vm.state !== 'first_visit' && <CoopPanel vm={vm} dispatch={dispatch} />}
        {currentJourney && vm.state !== 'first_visit' && vm.nextTravelScene && vm.overlay === 'none' && (
          <button className="travel-sign-f4" type="button" onClick={() => dispatch({ type: 'TRAVEL_TO_NEXT_SCENE' })}>
            <strong>去第 {vm.nextTravelScene.chapter} 章</strong><small>{vm.nextTravelScene.title} · 随时出发</small>
          </button>
        )}
        <SceneMapPanel vm={vm} dispatch={dispatch} />
        <DecorationCatalogPanel vm={vm} dispatch={dispatch} />
        <WardrobePanel vm={vm} dispatch={dispatch} />
        <ChapterCelebrationPanel vm={vm} dispatch={dispatch} />
        <TravelMealPrompt vm={vm} dispatch={dispatch} />
        {feedingTargetId && <FeedFlight targetId={feedingTargetId} motionEnabled={vm.motionEnabled} onArrive={finishFeeding} />}
      </section>
    </div>
  )
}
