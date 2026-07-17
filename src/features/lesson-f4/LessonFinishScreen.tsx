import { useEffect, useMemo, useState } from 'react'
import { f4AssetUrl } from '../farm-f4/assetUrl'
import { FarmStageShell } from '../farm-f4/visual/FarmStageShell'
import { normalizeLessonFinishSummary, type LessonFinishSummary } from './lessonFinishModel'
import '../../styles/f4/lesson-finish.css'

export interface LessonFinishScreenProps {
  dayNumber: number
  summary: LessonFinishSummary
  onReturnFarm: () => void
}

export function LessonFinishScreen({ dayNumber, summary, onReturnFarm }: LessonFinishScreenProps) {
  const [returning, setReturning] = useState(false)
  const report = useMemo(() => normalizeLessonFinishSummary(summary), [summary])
  const day = Math.max(1, Math.floor(dayNumber) || 1)

  const returnFarm = () => {
    if (returning) return
    setReturning(true)
    onReturnFarm()
  }

  useEffect(() => {
    const testWindow = window as Window & {
      render_game_to_text?: () => string
      advanceTime?: (ms: number) => void
    }
    testWindow.render_game_to_text = () => JSON.stringify({
      coordinateSystem: '1194x834 logical stage; origin top-left; x right; y down',
      screen: `lesson_finish_${returning ? 'returning' : 'ready'}`,
      praise: '真棒！',
      character: 'mother_hen_thumbsup',
      dayNumber: day,
      summary: report,
      controls: returning ? [] : ['return_farm'],
    })
    testWindow.advanceTime = () => undefined
    return () => {
      delete testWindow.render_game_to_text
      delete testWindow.advanceTime
    }
  }, [day, report, returning])

  return (
    <FarmStageShell ariaLabel="皮皮のEnglish 今日学习完成">
      <div className={`lesson-finish-f4 ${returning ? 'is-returning' : ''}`}>
        <div className="lesson-finish-wash-f4" aria-hidden="true" />

        <header className="lesson-finish-topbar-f4">
          <span className="lesson-finish-brand-f4"><span aria-hidden="true" />皮皮のEnglish</span>
          <span className="lesson-finish-day-f4">DAY {String(day).padStart(2, '0')} · 今日任务完成</span>
          <span className="lesson-finish-done-f4">今天完成啦</span>
        </header>

        <section className="lesson-finish-paper-f4">
          <div className="lesson-finish-celebration-f4">
            <span className="lesson-finish-kicker-f4">TODAY IS COMPLETE!</span>
            <div className="lesson-finish-bubble-f4" role="status">
              <svg viewBox="0 0 230 140" aria-hidden="true"><path d="M42 8 H188 Q222 8 222 41 V76 Q222 110 188 110 H75 L48 132 L52 109 H42 Q8 109 8 75 V42 Q8 8 42 8 Z" /></svg>
              <span><strong>真棒！</strong><small>母鸡妈妈陪你走到终点啦</small></span>
            </div>
            <img className="lesson-finish-mother-f4" src={f4AssetUrl('mother-thumbsup-f4-v1.png')} alt="母鸡妈妈竖起大拇指夸奖小皮" />
            <i className="lesson-finish-star-f4 is-one" aria-hidden="true" /><i className="lesson-finish-star-f4 is-two" aria-hidden="true" /><i className="lesson-finish-star-f4 is-three" aria-hidden="true" />
          </div>

          <div className="lesson-finish-report-f4">
            <p className="lesson-finish-report-kicker-f4">TODAY'S LITTLE REPORT</p>
            <h1>今天的单词都完成啦！</h1>
            <p className="lesson-finish-report-note-f4">每一次听、写和选择，都让新朋友记得更牢。</p>

            <div className="lesson-finish-stats-f4" aria-label="今日学习战报">
              <section><small>认识新朋友</small><strong>{report.newWords}</strong><span>个单词</span></section>
              <section><small>复习老朋友</small><strong>{report.reviews}</strong><span>个单词</span></section>
              <section><small>连续学习</small><strong>{report.streakDays}</strong><span>天</span></section>
            </div>

            <div className="lesson-finish-reward-f4"><span className="lesson-finish-egg-f4" aria-hidden="true" /><p><strong>母鸡妈妈下了一颗新鸡蛋</strong><small>回到农场就能看到它。</small></p><b>+{report.eggsEarned}</b></div>
            <button className="lesson-finish-return-f4" type="button" disabled={returning} onClick={returnFarm}>{returning ? '正在回农场…' : '回农场'}</button>
            <p className="lesson-finish-gentle-note-f4">今天已经完成了，接下来轻松玩一会儿吧。</p>
          </div>
        </section>
      </div>
    </FarmStageShell>
  )
}
