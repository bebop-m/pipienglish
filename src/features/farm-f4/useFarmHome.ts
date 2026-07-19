// 视觉桥:VM 订阅 + 事件分发。Codex 的视觉组件只 import 本 Hook 与 viewmodel 类型,
// 不得直接触碰 Dexie/FSRS(契约 §7)。overlay/chat 是客户端瞬时状态,在此本地维护。

import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../../application/db'
import { createFarmUsecases } from '../../application/usecases/farmHome'
import { speak } from '../../application/services/tts'
import type {
  ChickChatVM,
  FavoriteReplacementVM,
  FarmHomeEvent,
  FarmHomeViewModel,
  FarmOverlay,
} from '../../application/viewmodel'

const usecases = createFarmUsecases(db)
const CLOCK_GUARD_MS = 60_000
const HATCH_ARRIVAL_MS = 1_050

type CoreFarmHomeViewModel = Omit<
  FarmHomeViewModel,
  'overlay' | 'chat' | 'favoriteReplacement' | 'arrivingChick'
>

export interface FarmHomeBridge {
  vm: FarmHomeViewModel | null
  dispatch: (event: FarmHomeEvent) => Promise<void>
  /** 导航意图，由后续逐屏接入的路由层消费。 */
  navigation: 'lesson' | 'handwriting' | 'rescue' | 'parent' | null
  clearNavigation: () => void
}

export function useFarmHome(): FarmHomeBridge {
  const [core, setCore] = useState<CoreFarmHomeViewModel | null>(null)
  const [overlay, setOverlay] = useState<FarmOverlay>('none')
  const [chat, setChat] = useState<ChickChatVM | null>(null)
  const [favoriteReplacement, setFavoriteReplacement] = useState<FavoriteReplacementVM | null>(null)
  const [arrivingChick, setArrivingChick] = useState<FarmHomeViewModel['arrivingChick']>(null)
  const [navigation, setNavigation] = useState<'lesson' | 'handwriting' | 'rescue' | 'parent' | null>(null)
  const guardTimer = useRef<number | undefined>(undefined)
  const guardRun = useRef<Promise<void> | null>(null)
  const arrivalTimer = useRef<number | undefined>(undefined)
  const chatRequest = useRef(0)
  const coreRef = useRef<CoreFarmHomeViewModel | null>(null)

  const commitCore = useCallback((next: CoreFarmHomeViewModel) => {
    coreRef.current = next
    setCore(next)
  }, [])

  const refresh = useCallback(async () => {
    const next = await usecases.loadViewModel(undefined, coreRef.current?.viewedSceneId)
    commitCore(next)
    return next
  }, [commitCore])

  const runGuard = useCallback(() => {
    if (guardRun.current) return guardRun.current
    const task = (async () => {
      const before = coreRef.current
      const result = await usecases.clockGuard()
      const next = await usecases.loadViewModel(undefined, before?.viewedSceneId)
      const arrival = result.hatchedChickId
        ? next.chicksAll.find(chick => chick.chickId === result.hatchedChickId) ?? null
        : null
      if (!before || !arrival) {
        commitCore(next)
        return
      }

      const stillOwned = new Set(next.chicksAll.map(chick => chick.chickId))
      commitCore({
        ...next,
        chicksVisible: before.chicksVisible.filter(chick => stillOwned.has(chick.chickId)),
      })
      setArrivingChick(arrival)
      window.clearTimeout(arrivalTimer.current)
      arrivalTimer.current = window.setTimeout(async () => {
        setArrivingChick(null)
        await refresh()
      }, HATCH_ARRIVAL_MS)
    })()
    guardRun.current = task
    void task.finally(() => {
      if (guardRun.current === task) guardRun.current = null
    })
    return task
  }, [commitCore, refresh])

  useEffect(() => {
    runGuard()
    const onVisible = () => {
      if (document.visibilityState === 'visible') runGuard()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    guardTimer.current = window.setInterval(runGuard, CLOCK_GUARD_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.clearInterval(guardTimer.current)
      window.clearTimeout(arrivalTimer.current)
    }
  }, [runGuard])

  useEffect(() => {
    if (!chat) return
    const expiresAt = chat.expiresAt
    const timer = window.setTimeout(() => {
      setChat(current => (current?.expiresAt === expiresAt ? null : current))
    }, Math.max(0, expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [chat])

  useEffect(() => {
    if (core?.state !== 'first_visit' && core?.pendingCelebrationScene && overlay === 'none') {
      setOverlay('chapter_celebration')
    }
  }, [core?.pendingCelebrationScene?.id, core?.state, overlay])

  const dispatch = useCallback(
    async (event: FarmHomeEvent) => {
      switch (event.type) {
        case 'NAME_HEN':
          await usecases.nameHen(event.name)
          break
        case 'START_DAILY_LESSON':
          if (!coreRef.current?.isViewingCurrentJourney) return
          setNavigation('lesson')
          return
        case 'OPEN_HANDWRITING_GAME':
          if (!coreRef.current?.isViewingCurrentJourney) return
          setNavigation('handwriting')
          return
        case 'DAILY_LESSON_COMPLETED':
          if (!coreRef.current?.isViewingCurrentJourney) return
          await usecases.completeDailyLesson()
          break
        case 'OPEN_EGG_PANEL':
          if (!coreRef.current?.isViewingCurrentJourney) return
          setOverlay('egg_panel')
          return
        case 'CLOSE_EGG_PANEL':
          setOverlay('none')
          return
        case 'TOGGLE_HATCHERY_POP':
          if (!coreRef.current?.isViewingCurrentJourney) return
          setOverlay(o => (o === 'hatchery_pop' ? 'none' : 'hatchery_pop'))
          return
        case 'TOGGLE_RESCUE_POP':
          if (!coreRef.current?.isViewingCurrentJourney) return
          setOverlay(o => (o === 'rescue_pop' ? 'none' : 'rescue_pop'))
          return
        case 'OPEN_COOP':
          setFavoriteReplacement(null)
          setOverlay('coop')
          return
        case 'CLOSE_COOP':
          setFavoriteReplacement(null)
          setOverlay('none')
          return
        case 'OPEN_SCENE_MAP':
          setFavoriteReplacement(null)
          setOverlay('map')
          return
        case 'CLOSE_SCENE_MAP':
          setOverlay('none')
          return
        case 'VISIT_SCENE': {
          const next = await usecases.loadViewModel(undefined, event.sceneId)
          commitCore(next)
          setChat(null)
          setFavoriteReplacement(null)
          setOverlay('none')
          return
        }
        case 'RETURN_ACTIVE_SCENE': {
          const activeId = coreRef.current?.activeSceneId
          if (!activeId) return
          const next = await usecases.loadViewModel(undefined, activeId)
          commitCore(next)
          setChat(null)
          setFavoriteReplacement(null)
          setOverlay('none')
          return
        }
        case 'STAY_IN_CURRENT_SCENE':
          await usecases.acknowledgeChapter(event.chapter)
          setOverlay('none')
          await refresh()
          return
        case 'TRAVEL_TO_NEXT_SCENE':
          if (!coreRef.current?.nextTravelScene) return
          if (coreRef.current.cookingMeal) {
            setOverlay('travel_meal_prompt')
            return
          }
          {
            const result = await usecases.travelToNextScene(coreRef.current.activeSceneId, 'refund')
            if (result.status === 'travelled') {
              const next = await usecases.loadViewModel(undefined, result.farm.activeSceneId)
              commitCore(next)
              setChat(null)
              setOverlay('none')
            }
          }
          return
        case 'RESOLVE_TRAVEL_MEAL': {
          const current = coreRef.current
          if (!current) return
          const result = await usecases.travelToNextScene(current.activeSceneId, event.choice)
          if (result.status === 'serve-first') {
            setOverlay('egg_panel')
          } else if (result.status === 'travelled') {
            const next = await usecases.loadViewModel(undefined, result.farm.activeSceneId)
            commitCore(next)
            setChat(null)
            setOverlay('none')
          }
          return
        }
        case 'OPEN_DECORATION_CATALOG':
          if (!coreRef.current?.decorationCatalog.length) return
          setOverlay('sticker_catalog')
          return
        case 'CLOSE_DECORATION_CATALOG':
          setOverlay('none')
          return
        case 'BUY_DECORATION':
          await usecases.buyDecoration(event.sceneId, event.itemId)
          await refresh()
          return
        case 'PLACE_DECORATION':
          await usecases.placeDecoration(event.sceneId, event.itemId, event.home)
          await refresh()
          return
        case 'STORE_DECORATION':
          await usecases.storeDecoration(event.sceneId, event.itemId)
          await refresh()
          return
        case 'OPEN_WARDROBE':
          if (!coreRef.current?.wardrobeCatalog.length) return
          setOverlay('wardrobe')
          return
        case 'CLOSE_WARDROBE':
          setOverlay('none')
          return
        case 'BUY_COSMETIC':
          await usecases.buyCosmetic(event.itemId)
          await refresh()
          return
        case 'EQUIP_COSMETIC':
          await usecases.equipCosmetic(event.target, event.slot, event.itemId)
          await refresh()
          return
        case 'UNEQUIP_COSMETIC':
          await usecases.unequipCosmetic(event.target, event.slot)
          await refresh()
          return
        case 'TOGGLE_CHICK_FAVORITE': {
          const viewedSceneId = coreRef.current?.viewedSceneId
          const result = await usecases.favoriteChick(event.chickId, undefined, undefined, viewedSceneId)
          const next = await refresh()
          if (result.status === 'replacement-required') {
            const ids = new Set(result.replaceableFavorites.map(chick => chick.chickId))
            setOverlay('coop')
            setFavoriteReplacement({
              targetChickId: result.targetChickId,
              candidates: next.chicksAll.filter(chick => ids.has(chick.chickId)),
            })
          } else {
            setFavoriteReplacement(null)
          }
          return
        }
        case 'REPLACE_FAVORITE_CHICK':
          if (!favoriteReplacement) return
          await usecases.favoriteChick(
            favoriteReplacement.targetChickId,
            event.replaceChickId,
            undefined,
            coreRef.current?.viewedSceneId,
          )
          setFavoriteReplacement(null)
          await refresh()
          return
        case 'CANCEL_FAVORITE_REPLACEMENT':
          setFavoriteReplacement(null)
          return
        case 'ALLOCATE_EGG_TO_HATCH':
          if (!coreRef.current?.isViewingCurrentJourney) return
          await usecases.allocateEggToHatch()
          break
        case 'START_RECIPE':
          if (!coreRef.current?.isViewingCurrentJourney) return
          await usecases.startMeal(event.recipeId)
          break
        case 'COOKING_DONE':
          if (!coreRef.current?.isViewingCurrentJourney) return
          await usecases.mealAnimationDone()
          break
        case 'SERVE_SINGLE':
          if (!coreRef.current?.isViewingCurrentJourney) return
          await usecases.serveMeal(event.chickId)
          break
        case 'SERVE_GROUP':
          if (!coreRef.current?.isViewingCurrentJourney) return
          await usecases.serveMeal()
          break
        case 'OPEN_RESCUE':
          if (!coreRef.current?.isViewingCurrentJourney) return
          setNavigation('rescue')
          return
        case 'CHICK_CHAT': {
          const requestId = ++chatRequest.current
          const result = await usecases.chickChat(
            event.chickId,
            event.neighborIds,
            undefined,
            coreRef.current?.viewedSceneId,
          )
          if (requestId !== chatRequest.current) return
          if (result) {
            setChat(result)
            speak(result.primary.word) // 全局音频原则:只有 primary 播音(SPEC §2.6/§2.1)
          } else {
            setChat(null)
          }
          return
        }
        case 'CHAT_DISMISSED':
          chatRequest.current++
          setChat(null)
          return
        case 'CHICK_PLACED':
          await usecases.placeChick(event.chickId, event.home, undefined, coreRef.current?.viewedSceneId)
          break
        case 'SET_MOTION':
          await usecases.setMotion(event.enabled)
          break
        case 'SET_MUSIC':
          await usecases.setMusic(event.enabled)
          break
        case 'OPEN_PARENT':
          setNavigation('parent')
          return
      }
      await refresh()
    },
    [commitCore, favoriteReplacement, refresh],
  )

  return {
    vm: core ? { ...core, overlay, chat, favoriteReplacement, arrivingChick } : null,
    dispatch,
    navigation,
    clearNavigation: useCallback(() => setNavigation(null), []),
  }
}
