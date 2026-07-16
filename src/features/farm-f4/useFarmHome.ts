// 视觉桥:VM 订阅 + 事件分发。Codex 的视觉组件只 import 本 Hook 与 viewmodel 类型,
// 不得直接触碰 Dexie/FSRS(契约 §7)。overlay/chat 是客户端瞬时状态,在此本地维护。

import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../../application/db'
import { createFarmUsecases } from '../../application/usecases/farmHome'
import { speak } from '../../application/services/tts'
import type { ChickChatVM, FarmHomeEvent, FarmHomeViewModel, FarmOverlay } from '../../application/viewmodel'

const usecases = createFarmUsecases(db)
const CLOCK_GUARD_MS = 60_000

export interface FarmHomeBridge {
  vm: FarmHomeViewModel | null
  dispatch: (event: FarmHomeEvent) => Promise<void>
  /** 导航意图，由后续逐屏接入的路由层消费。 */
  navigation: 'lesson' | 'handwriting' | 'rescue' | 'parent' | null
  clearNavigation: () => void
}

export function useFarmHome(): FarmHomeBridge {
  const [core, setCore] = useState<Omit<FarmHomeViewModel, 'overlay' | 'chat'> | null>(null)
  const [overlay, setOverlay] = useState<FarmOverlay>('none')
  const [chat, setChat] = useState<ChickChatVM | null>(null)
  const [navigation, setNavigation] = useState<'lesson' | 'handwriting' | 'rescue' | 'parent' | null>(null)
  const guardTimer = useRef<number | undefined>(undefined)
  const chatRequest = useRef(0)

  const refresh = useCallback(async () => {
    setCore(await usecases.loadViewModel())
  }, [])

  const runGuard = useCallback(async () => {
    await usecases.clockGuard()
    await refresh()
  }, [refresh])

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

  const dispatch = useCallback(
    async (event: FarmHomeEvent) => {
      switch (event.type) {
        case 'NAME_HEN':
          await usecases.nameHen(event.name)
          break
        case 'START_DAILY_LESSON':
          setNavigation('lesson')
          return
        case 'OPEN_HANDWRITING_GAME':
          setNavigation('handwriting')
          return
        case 'DAILY_LESSON_COMPLETED':
          await usecases.completeDailyLesson()
          break
        case 'OPEN_EGG_PANEL':
          setOverlay('egg_panel')
          return
        case 'CLOSE_EGG_PANEL':
          setOverlay('none')
          return
        case 'TOGGLE_HATCHERY_POP':
          setOverlay(o => (o === 'hatchery_pop' ? 'none' : 'hatchery_pop'))
          return
        case 'TOGGLE_RESCUE_POP':
          setOverlay(o => (o === 'rescue_pop' ? 'none' : 'rescue_pop'))
          return
        case 'ALLOCATE_EGG_TO_HATCH':
          await usecases.allocateEggToHatch()
          break
        case 'PUT_EGG_IN_PAN':
          await usecases.putEggInPan()
          break
        case 'START_FRYING':
          return // 烹饪动画态不落库;视觉层计时结束后派 FRYING_DONE
        case 'FRYING_DONE':
          await usecases.fryingDone()
          break
        case 'FEED_CHICK':
          await usecases.feedDone(event.chickId)
          break
        case 'OPEN_RESCUE':
          setNavigation('rescue')
          return
        case 'CHICK_CHAT': {
          const requestId = ++chatRequest.current
          const result = await usecases.chickChat(event.chickId, event.neighborIds)
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
          await usecases.placeChick(event.chickId, event.home)
          break
        case 'SET_MOTION':
          await usecases.setMotion(event.enabled)
          break
        case 'OPEN_PARENT':
          setNavigation('parent')
          return
      }
      await refresh()
    },
    [refresh],
  )

  return {
    vm: core ? { ...core, overlay, chat } : null,
    dispatch,
    navigation,
    clearNavigation: useCallback(() => setNavigation(null), []),
  }
}
