// ⚠️ DEV PLACEHOLDER ⚠️
// 内部开发壳:仅用于驱动与验证架构逻辑(状态机/蛋经济/孵化/迁移)。
// 无任何视觉主张,永不进入面向小皮的构建(契约 §5;V-8 裁决:最终落地前小皮不使用)。

import { useState } from 'react'
import type { FarmHomeBridge } from '../features/farm-f4/useFarmHome'
import { db, getFarmStateV3, setFarmStateV3 } from '../application/db'
import { exportAll, importAll } from '../application/backup'
import { dayKey } from '../domain/time'
import { HATCH_MS } from '../domain/types'
import { newCard, rate } from '../domain/srs'
import { persistedChickWithDefaults } from '../application/farmPersistence'

export function DevFarmView({ bridge }: { bridge: FarmHomeBridge }) {
  const { vm, dispatch, navigation, clearNavigation } = bridge
  const [henName, setHenName] = useState('')

  if (!vm) return <div className="dev-shell">加载中…</div>

  const btn = (label: string, onClick: () => void, disabled = false) => (
    <button className="dev-btn" onClick={onClick} disabled={disabled}>{label}</button>
  )

  return (
    <div className="dev-shell">
      <div className="dev-banner">⚠️ DEV PLACEHOLDER — 内部开发壳,不面向小皮。F4 视觉由 Codex 实现。</div>

      <h3>状态:{vm.state} {navigation && <em>(导航意图:{navigation})</em>}</h3>

      <div className="dev-row">
        {vm.state === 'first_visit' && (
          <>
            <input value={henName} placeholder="母鸡名字" onChange={e => setHenName(e.target.value)} />
            {btn('起名', () => dispatch({ type: 'NAME_HEN', name: henName }))}
          </>
        )}
        {btn('开始今日学习(导航)', () => dispatch({ type: 'START_DAILY_LESSON' }), vm.state !== 'daily_incomplete')}
        {btn('[模拟] 完成今日学习', () => dispatch({ type: 'DAILY_LESSON_COMPLETED', newWords: vm.dailyTarget, reviews: vm.reviewCountToday }), vm.state !== 'daily_incomplete')}
        {navigation && btn('清除导航意图', clearNavigation)}
        {import.meta.env.DEV && btn('[测试] 回到未完成首页（保留资产）', async () => {
          const session = await db.sessions.get(dayKey())
          if (session) {
            await db.sessions.put({ ...session, completed: false, doneCount: 0, answered: 0, correct: 0 })
          }
          window.location.assign(window.location.pathname)
        })}
        {import.meta.env.DEV && btn('[测试] 推进孵化 24 小时', async () => {
          const now = Date.now()
          const farm = await getFarmStateV3(db, { now, today: dayKey(new Date(now)) })
          await setFarmStateV3(db, {
            ...farm,
            incubating: farm.incubating
              ? { ...farm.incubating, placedAt: now - HATCH_MS - 1 }
              : null,
          })
          window.location.reload()
        }, vm.incubating === null)}
        {import.meta.env.DEV && btn('[测试] 准备群聊验收数据', async () => {
          const today = dayKey()
          await db.chicks.bulkPut(['dev-a', 'dev-b', 'dev-c'].map(chickId => persistedChickWithDefaults({
            chickId,
            bornOn: today,
            source: 'hatch' as const,
            homeX: null,
            homeY: null,
          })))
          for (const wordId of ['apple', 'banana', 'orange']) {
            const card = rate(newCard(), true)
            await db.cards.put({ wordId, due: card.due.getTime(), card })
            await db.seen.put({ wordId, lastSeenAt: Date.now() })
          }
          window.location.reload()
        })}
        {import.meta.env.DEV && btn('[测试] 关闭自主运动', () => {
          dispatch({ type: 'SET_MOTION', enabled: false })
        }, !vm.motionEnabled)}
        {import.meta.env.DEV && btn('[测试] 把 dev-c 放到 720,620', () => {
          dispatch({ type: 'CHICK_PLACED', chickId: 'dev-c', home: { x: 720, y: 620 } })
        }, !vm.chicksVisible.some(chick => chick.chickId === 'dev-c'))}
      </div>

      <div className="dev-row">
        {btn('蛋→孵化', () => dispatch({ type: 'ALLOCATE_EGG_TO_HATCH' }), vm.eggStock === 0 || vm.incubating !== null)}
        {btn('1 蛋单份', () => dispatch({ type: 'START_RECIPE', recipeId: 'single_fried_egg' }), !vm.availableRecipes.find(recipe => recipe.recipeId === 'single_fried_egg')?.enabled)}
        {btn('料理完成', () => dispatch({ type: 'COOKING_DONE' }), vm.cookingMeal?.phase !== 'raw')}
        {btn('享用单份', () => dispatch({ type: 'SERVE_SINGLE', chickId: vm.chicksVisible[0]?.chickId ?? '' }), vm.cookingMeal?.phase !== 'ready' || vm.cookingMeal.recipeId !== 'single_fried_egg' || vm.chicksVisible.length === 0)}
        {btn('享用群餐', () => dispatch({ type: 'SERVE_GROUP' }), vm.cookingMeal?.phase !== 'ready' || vm.cookingMeal.recipeId === 'single_fried_egg')}
        {btn('群聊测试', () => dispatch({ type: 'CHICK_CHAT', chickId: 'dev-a', neighborIds: ['dev-b', 'dev-c'] }))}
      </div>

      <div className="dev-row">
        {btn('导出备份', async () => {
          const json = await exportAll(db)
          const blob = new Blob([json], { type: 'application/json' })
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = `pipienglish-backup-${new Date().toISOString().slice(0, 10)}.json`
          a.click()
          URL.revokeObjectURL(a.href)
        })}
        <label className="dev-btn">
          导入备份
          <input type="file" accept=".json" hidden onChange={async e => {
            const file = e.target.files?.[0]
            if (file && window.confirm('导入会覆盖当前所有数据,确定?')) {
              await importAll(db, await file.text())
              window.location.reload()
            }
          }} />
        </label>
      </div>

      {vm.chat && (
        <div className="dev-chat">
          群聊:<b>{vm.chat.primary.word}</b>({vm.chat.primary.meaning})🔊
          {vm.chat.others.map(o => <span key={o.chickId}> · {o.word}({o.meaning})</span>)}
          <button className="dev-btn" onClick={() => dispatch({ type: 'CHAT_DISMISSED' })}>×</button>
        </div>
      )}

      <pre className="dev-vm">{JSON.stringify(vm, null, 2)}</pre>
    </div>
  )
}
