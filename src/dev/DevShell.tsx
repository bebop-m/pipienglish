// ⚠️ DEV PLACEHOLDER ⚠️
// 内部开发壳:仅用于驱动与验证架构逻辑(状态机/蛋经济/孵化/迁移)。
// 无任何视觉主张,永不进入面向小皮的构建(契约 §5;V-8 裁决:最终落地前小皮不使用)。

import { useState } from 'react'
import type { FarmHomeBridge } from '../features/farm-f4/useFarmHome'
import { db } from '../application/db'
import { exportAll, importAll } from '../application/backup'

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
      </div>

      <div className="dev-row">
        {btn('蛋→孵化', () => dispatch({ type: 'ALLOCATE_EGG_TO_HATCH' }), vm.eggStock === 0 || vm.incubating.length >= 3)}
        {btn('蛋→下锅', () => dispatch({ type: 'PUT_EGG_IN_PAN' }), vm.eggStock === 0 || vm.cooking !== 'empty')}
        {btn('煎好', () => dispatch({ type: 'FRYING_DONE' }), vm.cooking !== 'raw')}
        {btn('喂食', () => dispatch({ type: 'FEED_CHICK' }), vm.cooking !== 'ready')}
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
