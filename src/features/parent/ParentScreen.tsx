// 家长页 v1(SPEC §8 第 5 屏,2026-07-17 裁决「统计 + 备份,朴素即可」):
// 算术门控 + 导出/导入 JSON + 连胜日历 + 改蛋数 + 快进到 Day N(2026-08-05 爸爸新增)。
// 面向爸爸的朴素 UI,不做 F4 视觉主张,不使用 F4 资产。

import { useEffect, useMemo, useRef, useState } from 'react'
import { db, getFarmStateV3, getKV, setFarmStateV3, setKV } from '../../application/db'
import { exportAll, importAll } from '../../application/backup'
import { fastForward, validateFastForwardInput } from '../../application/fastForward'
import type { FarmStateV3 } from '../../application/farmPersistence'
import { defaultMeta } from '../../application/db'
import type { DailySession, MetaState } from '../../domain/types'
import { addDays, dayKey } from '../../domain/time'
import { SHIELD_CARD_CAP } from '../../domain/streak'
import './parent.css'

const LAST_EXPORT_KEY = 'parentLastExportAt'
const EXPORT_REMINDER_DAYS = 7 // SPEC §6:定期导出提醒;超过即在家长页顶部标黄

function backupFileName(): string {
  return `pipienglish-backup-${dayKey()}.json`
}

/** 导出:优先系统分享(iPad 上可直接 AirDrop/存文件),失败回退下载 */
async function shareOrDownload(json: string): Promise<void> {
  const file = new File([json], backupFileName(), { type: 'application/json' })
  const shareData = { files: [file] }
  if (typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData)
      return
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return // 用户取消分享,不再弹下载
    }
  }
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  anchor.download = backupFileName()
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

interface GateProps {
  onPass: () => void
  onExit: () => void
}

/** 防小皮误入:两位数乘一位数,答错换题 */
function ParentGate({ onPass, onExit }: GateProps) {
  const [seed, setSeed] = useState(0)
  const [answer, setAnswer] = useState('')
  const [wrong, setWrong] = useState(false)
  const { a, b } = useMemo(() => ({
    a: 12 + Math.floor(Math.random() * 8),
    b: 6 + Math.floor(Math.random() * 4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [seed])

  const submit = () => {
    if (Number(answer) === a * b) {
      onPass()
    } else {
      setWrong(true)
      setAnswer('')
      setSeed(s => s + 1)
    }
  }

  return (
    <div className="parent-gate">
      <h2>家长确认</h2>
      <p>请回答:{a} × {b} = ?</p>
      <input
        className="parent-input"
        inputMode="numeric"
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        aria-label="算术答案"
      />
      <div className="parent-actions">
        <button className="parent-btn" type="button" onClick={submit}>确认</button>
        <button className="parent-btn parent-btn-plain" type="button" onClick={onExit}>返回农场</button>
      </div>
      {wrong && <p className="parent-warn">不对哦,换一题再试。</p>}
    </div>
  )
}

interface LoadedData {
  meta: MetaState
  farm: FarmStateV3
  sessions: DailySession[]
  lastExportAt: number | null
}

async function loadData(): Promise<LoadedData> {
  const now = Date.now()
  const today = dayKey()
  const [meta, farm, sessions, lastExportAt] = await Promise.all([
    getKV<MetaState>(db, 'meta', defaultMeta(today)),
    getFarmStateV3(db, { now, today }),
    db.sessions.where('date').aboveOrEqual(addDays(today, -55)).toArray(),
    getKV<number | null>(db, LAST_EXPORT_KEY, null),
  ])
  return { meta, farm, sessions, lastExportAt }
}

/** 设备诊断:真机视口/安全区读数,定位「底部横带」「舞台缩放不对」这类只在 iPad 上出现的问题 */
function DeviceDiagnostics() {
  const probeRef = useRef<HTMLDivElement>(null)
  const [report, setReport] = useState('')

  useEffect(() => {
    const measure = () => {
      const nav = navigator as Navigator & { standalone?: boolean }
      const probe = probeRef.current ? getComputedStyle(probeRef.current) : null
      const lines = [
        `视口 innerWidth×innerHeight: ${window.innerWidth}×${window.innerHeight}`,
        `屏幕 screen: ${window.screen.width}×${window.screen.height} · dpr ${window.devicePixelRatio}`,
        `visualViewport: ${window.visualViewport ? `${Math.round(window.visualViewport.width)}×${Math.round(window.visualViewport.height)}` : '不支持'}`,
        `documentElement.clientHeight: ${document.documentElement.clientHeight} · outerHeight: ${window.outerHeight}`,
        `安全区 top/right/bottom/left: ${probe ? [probe.paddingTop, probe.paddingRight, probe.paddingBottom, probe.paddingLeft].join(' / ') : '—'}`,
        `standalone: navigator.standalone=${String(nav.standalone)} · display-mode=${window.matchMedia('(display-mode: standalone)').matches}`,
        `方向: ${window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait'}`,
        `UA: ${navigator.userAgent}`,
      ]
      setReport(lines.join('\n'))
    }
    measure()
    window.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <>
      <div ref={probeRef} className="parent-safe-probe" aria-hidden="true" />
      <pre className="parent-diag">{report}</pre>
    </>
  )
}

/** 最近 8 周完成日历:一行一周,✓ = 当天必修完成 */
function StreakCalendar({ sessions, today }: { sessions: DailySession[]; today: string }) {
  const done = useMemo(
    () => new Set(sessions.filter(session => session.completed).map(session => session.date)),
    [sessions],
  )
  const weeks: string[][] = []
  for (let week = 7; week >= 0; week--) {
    const row: string[] = []
    for (let day = 6; day >= 0; day--) row.push(addDays(today, -(week * 7 + day)))
    weeks.push(row)
  }
  return (
    <table className="parent-calendar">
      <tbody>
        {weeks.map(row => (
          <tr key={row[0]}>
            {row.map(date => (
              <td key={date} className={done.has(date) ? 'is-done' : ''} title={date}>
                <span className="parent-calendar-day">{Number(date.slice(8, 10))}</span>
                {done.has(date) ? '✓' : ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ParentScreen({ onExit }: { onExit: () => void }) {
  const [unlocked, setUnlocked] = useState(false)

  // 家长页也把画布底色设成自己的米色,视口外的横带不再是天蓝
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--f4-canvas', '#f6f2ea')
    return () => {
      root.style.removeProperty('--f4-canvas')
    }
  }, [])
  const [data, setData] = useState<LoadedData | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [eggInput, setEggInput] = useState('')
  const [ff, setFf] = useState({ days: '', streak: '', chicks: '', eggs: '', henName: '' })

  const refresh = () => loadData().then(loaded => {
    setData(loaded)
    setEggInput(String(loaded.farm.eggStock))
    setFf(prev => ({ ...prev, henName: prev.henName || loaded.farm.henName || '' }))
  })

  useEffect(() => {
    if (unlocked) void refresh()
  }, [unlocked])

  if (!unlocked) return <ParentGate onPass={() => setUnlocked(true)} onExit={onExit} />
  if (!data) return <div className="parent-screen"><p>加载中…</p></div>

  const today = dayKey()
  const daysSinceExport = data.lastExportAt === null
    ? null
    : Math.floor((Date.now() - data.lastExportAt) / 86_400_000)
  const exportOverdue = daysSinceExport === null || daysSinceExport >= EXPORT_REMINDER_DAYS

  const doExport = async () => {
    setBusy(true)
    try {
      const json = await exportAll(db)
      await shareOrDownload(json)
      await setKV(db, LAST_EXPORT_KEY, Date.now())
      setNotice('已导出。请把文件存到「文件」或 iCloud Drive。')
      await refresh()
    } catch (error) {
      setNotice(`导出失败:${(error as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const doImport = async (file: File) => {
    if (!window.confirm('导入会覆盖本机全部学习数据和农场资产,确定继续?')) return
    setBusy(true)
    try {
      await importAll(db, await file.text())
      window.location.reload()
    } catch (error) {
      setNotice(`导入失败,本机数据未动:${(error as Error).message}`)
      setBusy(false)
    }
  }

  const saveEggs = async () => {
    const value = Number(eggInput)
    if (!Number.isInteger(value) || value < 0 || value > 9999) {
      setNotice('蛋数需为 0–9999 的整数')
      return
    }
    const now = Date.now()
    const farm = await getFarmStateV3(db, { now, today: dayKey() })
    await setFarmStateV3(db, { ...farm, eggStock: value })
    setNotice(`蛋库存已改为 ${value}`)
    await refresh()
  }

  /** 病假/旅行手动补一张守护卡(SPEC §3.3 的「病假旅行自动补」改为家长手动) */
  const addShield = async () => {
    const meta = await getKV<MetaState>(db, 'meta', defaultMeta(dayKey()))
    const current = meta.freezeCards ?? 0
    if (current >= SHIELD_CARD_CAP) {
      setNotice(`守护卡已经是上限 ${SHIELD_CARD_CAP} 张`)
      return
    }
    await setKV(db, 'meta', { ...meta, freezeCards: current + 1 })
    setNotice(`已补 1 张守护卡,现在 ${current + 1} 张`)
    await refresh()
  }

  const doFastForward = async () => {
    const input = {
      days: Number(ff.days),
      streak: Number(ff.streak === '' ? ff.days : ff.streak),
      chicks: Number(ff.chicks || 0),
      eggs: Number(ff.eggs || 0),
      henName: ff.henName,
    }
    const invalid = validateFastForwardInput(input)
    if (invalid) {
      setNotice(invalid)
      return
    }
    const confirmed = window.confirm(
      `快进会清空本机现有全部数据,重建为:已学 ${input.days} 天、连胜 ${Math.min(input.streak, input.days)}、`
      + `小鸡 ${input.chicks} 只、蛋 ${input.eggs} 颗、母鸡叫「${input.henName.trim() || '未起名'}」。\n\n`
      + '此操作不可撤销,且之后旧设备的备份不能再导入本机(会覆盖新进度)。确定?',
    )
    if (!confirmed || !window.confirm('再确认一次:清空本机数据并快进?')) return
    setBusy(true)
    try {
      const result = await fastForward(db, input)
      window.alert(`完成:模拟 ${result.daysSimulated} 天(${result.firstDay} ~ ${result.lastDay}),共 ${result.wordsLearned} 个词。`)
      window.location.reload()
    } catch (error) {
      setNotice(`快进失败:${(error as Error).message}`)
      setBusy(false)
    }
  }

  return (
    <div className="parent-screen">
      <header className="parent-header">
        <h1>家长页</h1>
        <button className="parent-btn parent-btn-plain" type="button" onClick={onExit}>返回农场</button>
      </header>

      {notice && <p className="parent-notice" role="status">{notice}</p>}

      <section className="parent-section">
        <h2>学习统计</h2>
        <p>
          连续 <b>{data.meta.streak}</b> 天 · 累计 <b>{data.meta.totalDays}</b> 天
          · 守护卡 <b>{data.meta.freezeCards ?? 0}</b> / {SHIELD_CARD_CAP} 张
          · 上次完成 {data.meta.lastDoneDate ?? '—'} · 安装于 {data.meta.installDate}
        </p>
        <p className="parent-hint">
          每连续 7 天自动得 1 张守护卡,漏学时自动用掉接上连续天数;病假或旅行可以在这里手动补一张。
        </p>
        <div className="parent-actions">
          <button className="parent-btn parent-btn-plain" type="button" disabled={busy} onClick={() => void addShield()}>补 1 张守护卡</button>
        </div>
        <StreakCalendar sessions={data.sessions} today={today} />
      </section>

      <section className="parent-section">
        <h2>设备诊断</h2>
        <p className="parent-hint">遇到「底部有横带」「画面缩放不对」时,把这一块截图发给开发。</p>
        <DeviceDiagnostics />
      </section>

      <section className="parent-section">
        <h2>备份</h2>
        <p className={exportOverdue ? 'parent-warn' : ''}>
          {daysSinceExport === null ? '本机还没有导出过备份。' : `上次导出:${daysSinceExport} 天前。`}
          {exportOverdue && '建议现在导出一份存到 iCloud Drive。'}
        </p>
        <div className="parent-actions">
          <button className="parent-btn" type="button" disabled={busy} onClick={() => void doExport()}>
            导出备份 JSON
          </button>
          <label className={`parent-btn parent-btn-plain${busy ? ' is-disabled' : ''}`}>
            导入备份 JSON
            <input
              type="file"
              accept=".json,application/json"
              hidden
              disabled={busy}
              onChange={e => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void doImport(file)
              }}
            />
          </label>
        </div>
      </section>

      <section className="parent-section">
        <h2>鸡蛋库存</h2>
        <div className="parent-actions">
          <input
            className="parent-input"
            inputMode="numeric"
            value={eggInput}
            onChange={e => setEggInput(e.target.value)}
            aria-label="蛋库存数量"
          />
          <button className="parent-btn" type="button" disabled={busy} onClick={() => void saveEggs()}>保存</button>
        </div>
        <p className="parent-hint">当前 {data.farm.eggStock} 颗;孵化棚中的蛋不计入,不受修改影响。</p>
      </section>

      <section className="parent-section parent-section-danger">
        <h2>快进到 Day N(换机应急)</h2>
        <p className="parent-hint">
          清空本机数据,模拟出「按计划连续 N 天全部完成」的存档:已学单词与固定学习计划完全一致,
          复习节奏按全对近似。描红笔迹、待救小鸡、贴纸装扮不会恢复。
        </p>
        <div className="parent-grid">
          <label>已学天数 N<input className="parent-input" inputMode="numeric" value={ff.days} onChange={e => setFf({ ...ff, days: e.target.value })} /></label>
          <label>连胜(默认=N)<input className="parent-input" inputMode="numeric" value={ff.streak} onChange={e => setFf({ ...ff, streak: e.target.value })} /></label>
          <label>小鸡数<input className="parent-input" inputMode="numeric" value={ff.chicks} onChange={e => setFf({ ...ff, chicks: e.target.value })} /></label>
          <label>蛋库存<input className="parent-input" inputMode="numeric" value={ff.eggs} onChange={e => setFf({ ...ff, eggs: e.target.value })} /></label>
          <label>母鸡名字<input className="parent-input" value={ff.henName} onChange={e => setFf({ ...ff, henName: e.target.value })} /></label>
        </div>
        <button className="parent-btn parent-btn-danger" type="button" disabled={busy} onClick={() => void doFastForward()}>
          清空并快进
        </button>
      </section>
    </div>
  )
}
