import type { CSSProperties } from 'react'
import { f4AssetUrl } from '../farm-f4/assetUrl'
import { lessonProgressPercent } from './lessonIntroModel'

type LessonProgressVariant = 'intro' | 'choice' | 'trace'

interface LessonProgressProps {
  variant: LessonProgressVariant
  title: string
  progressText: string
  done: number
  total: number
}

const MILESTONES = [0, 100 / 3, 200 / 3, 100] as const

/** 所有学习场景共用同一套真实进度：填充、里程点和当前位置始终来自 done / total。 */
export function LessonProgress({ variant, title, progressText, done, total }: LessonProgressProps) {
  const prefix = variant === 'intro' ? 'lesson' : `lesson-${variant}`
  const progress = lessonProgressPercent(done, total)
  const positionStyle = { left: `${progress}%` } as CSSProperties

  return (
    <section className={`${prefix}-progress-f4`} aria-label={`今日学习进度 ${done} / ${total}`}>
      <div className={`${prefix}-progress-copy-f4`}><strong>{title}</strong><span>{progressText}</span></div>
      <div
        className={`${prefix}-progress-path-f4`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={Math.max(1, total)}
        aria-valuenow={Math.max(0, Math.min(done, total))}
      >
        <span className={`${prefix}-progress-fill-f4`} style={{ width: `${progress}%` }} />
        {MILESTONES.map((milestone) => (
          <span
            key={milestone}
            className={`${prefix}-progress-dot-f4 ${progress >= milestone ? 'is-done' : ''}`}
            style={{ left: `${milestone}%` }}
            aria-hidden="true"
          />
        ))}
        <span className={`${prefix}-progress-dot-f4 is-current`} style={positionStyle} aria-hidden="true" />
      </div>
      <img className={`${prefix}-progress-hen-f4`} src={f4AssetUrl('mother-f3.png')} alt="母鸡妈妈正在向终点走" />
    </section>
  )
}
