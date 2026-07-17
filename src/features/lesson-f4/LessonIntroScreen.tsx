import { useEffect, useRef, useState } from 'react'
import { speak } from '../../application/services/tts'
import { f4AssetUrl } from '../farm-f4/assetUrl'
import { FarmStageShell } from '../farm-f4/visual/FarmStageShell'
import {
  lessonIllustrationFilename,
  lessonProgressPercent,
  repeatedWordUtterance,
  type LessonIntroWord,
} from './lessonIntroModel'
import '../../styles/f4/lesson-intro.css'

export interface LessonIntroScreenProps {
  word: LessonIntroWord
  todayDone: number
  todayTotal: number
  stepIndex?: number
  stepTotal?: number
  onBack: () => void
  onComplete: () => void
  speakText?: (text: string) => boolean
}

function SoundBars() {
  return <span className="lesson-sound-bars" aria-hidden="true"><i /><i /><i /></span>
}

export function LessonIntroScreen({
  word,
  todayDone,
  todayTotal,
  stepIndex = 1,
  stepTotal = 3,
  onBack,
  onComplete,
  speakText = speak,
}: LessonIntroScreenProps) {
  const [wordVisible, setWordVisible] = useState(false)
  const steppedMs = useRef(0)
  const illustration = lessonIllustrationFilename(word)
  const progress = lessonProgressPercent(todayDone, todayTotal)

  useEffect(() => {
    setWordVisible(false)
    steppedMs.current = 0
    const utterance = repeatedWordUtterance(word.word)
    const speakTimer = window.setTimeout(() => {
      if (utterance) speakText(utterance)
    }, 60)
    const revealTimer = window.setTimeout(() => setWordVisible(true), 500)
    return () => {
      window.clearTimeout(speakTimer)
      window.clearTimeout(revealTimer)
    }
  }, [speakText, word.id, word.word])

  useEffect(() => {
    const testWindow = window as Window & {
      render_game_to_text?: () => string
      advanceTime?: (ms: number) => void
    }
    testWindow.render_game_to_text = () => JSON.stringify({
      coordinateSystem: '1194x834 logical stage; origin top-left; x right; y down',
      screen: 'lesson_intro',
      variant: illustration ? 'with_image' : 'text_first',
      word: word.word,
      meaning: word.meaning,
      sentence: word.sentence,
      wordVisible,
      progress: { done: todayDone, total: todayTotal, step: stepIndex, stepTotal },
      controls: ['back', 'replay_word', 'replay_sentence', 'complete_intro'],
    })
    testWindow.advanceTime = (ms: number) => {
      steppedMs.current += Math.max(0, ms)
      if (steppedMs.current >= 500) setWordVisible(true)
    }
    return () => {
      delete testWindow.render_game_to_text
      delete testWindow.advanceTime
    }
  }, [illustration, stepIndex, stepTotal, todayDone, todayTotal, word.meaning, word.sentence, word.word, wordVisible])

  const replayWord = () => speakText(word.word)
  const replaySentence = () => speakText(word.sentence)

  return (
    <FarmStageShell ariaLabel="皮皮のEnglish 今日学习">
      <div className="lesson-intro-f4">
        <div className="lesson-intro-wash-f4" aria-hidden="true" />

        <header className="lesson-intro-header-f4">
          <button className="lesson-back-f4" type="button" onClick={onBack}>
            <span aria-hidden="true" />回农场
          </button>
          <section className="lesson-progress-f4" aria-label={`今日学习进度 ${todayDone} / ${todayTotal}`}>
            <div className="lesson-progress-copy-f4">
              <strong>新朋友 · 第 {stepIndex} 步 / {stepTotal}</strong>
              <span>今日进度 {todayDone} / {todayTotal}</span>
            </div>
            <div className="lesson-progress-path-f4">
              <span className="lesson-progress-fill-f4" style={{ width: `${progress}%` }} />
              <span className="lesson-progress-dot-f4 is-done" />
              <span className="lesson-progress-dot-f4 is-current" />
              <span className="lesson-progress-dot-f4" />
              <span className="lesson-progress-dot-f4" />
            </div>
            <img className="lesson-progress-hen-f4" src={f4AssetUrl('mother-f3.png')} alt="母鸡妈妈正在向终点走" />
          </section>
          <span className="lesson-step-chip-f4">听一听 · 看一看</span>
        </header>

        <section className={`lesson-paper-f4 ${illustration ? 'has-art' : 'no-art'}`}>
          {illustration ? (
            <div className="lesson-art-f4">
              <span className="lesson-art-halo-f4" aria-hidden="true" />
              <img src={f4AssetUrl(illustration)} alt={`${word.meaning}的手绘插图`} />
              <span className="lesson-listen-note-f4">先听两遍，再跟着读</span>
            </div>
          ) : null}

          <div className={illustration ? 'lesson-copy-f4' : 'lesson-copy-f4 lesson-copy-no-art-f4'}>
            <p className="lesson-kicker-f4">HELLO, NEW FRIEND!</p>
            <div className={illustration ? 'lesson-word-block-f4' : 'lesson-word-stage-f4'}>
              {!illustration && <span className="lesson-listen-guide-f4">先听一遍，再跟着读</span>}
              <div className="lesson-word-line-f4">
                <h1 className={wordVisible ? 'is-visible' : ''}>{word.word}</h1>
                <button className="lesson-replay-f4" type="button" onClick={replayWord} aria-label={`再次播放单词 ${word.word}`}>
                  <SoundBars />再听一次
                </button>
              </div>
              <div className="lesson-word-details-f4">
                {word.ipa && <span className="lesson-ipa-f4">{word.ipa}</span>}
                <span className="lesson-meaning-f4">{word.meaning}</span>
              </div>
            </div>

            <button className="lesson-sentence-f4" type="button" onClick={replaySentence} aria-label={`播放例句：${word.sentence}`}>
              {!illustration && <span className="lesson-sentence-label-f4">放进句子里</span>}
              <strong>{word.sentence}</strong>
              <span>{word.sentenceCn}</span>
              <span className="lesson-sentence-audio-f4"><SoundBars /></span>
            </button>

            <button className="lesson-primary-f4" type="button" onClick={onComplete}>我认识它了！</button>
            <p className="lesson-tip-f4">{illustration ? '不用背下来，先和新朋友打个招呼。' : '不用背下来，先听懂它在句子里的意思。'}</p>
          </div>
        </section>
      </div>
    </FarmStageShell>
  )
}
