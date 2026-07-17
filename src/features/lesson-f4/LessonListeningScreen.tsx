import { useEffect, useState } from 'react'
import { speak } from '../../application/services/tts'
import { f4AssetUrl } from '../farm-f4/assetUrl'
import { FarmStageShell } from '../farm-f4/visual/FarmStageShell'
import { lessonProgressPercent, type LessonIntroWord } from './lessonIntroModel'
import {
  judgeLessonChoice,
  type LessonChoiceOption,
  type LessonChoiceState,
} from './lessonChoiceModel'
import { shouldRevealListeningTarget } from './lessonListeningModel'
import '../../styles/f4/lesson-choice.css'
import '../../styles/f4/lesson-listening.css'

export interface LessonListeningAnswer {
  selectedId: string
  correct: boolean
}

export interface LessonListeningScreenProps {
  word: LessonIntroWord
  options: LessonChoiceOption[]
  correctOptionId: string
  todayDone: number
  todayTotal: number
  questionIndex?: number
  questionTotal?: number
  onBack: () => void
  onAnswer: (answer: LessonListeningAnswer) => void
  onContinue: () => void
  speakText?: (text: string) => boolean
}

function SoundBars() {
  return <span className="lesson-choice-sound-f4" aria-hidden="true"><i /><i /><i /></span>
}

export function LessonListeningScreen({
  word,
  options,
  correctOptionId,
  todayDone,
  todayTotal,
  questionIndex = 1,
  questionTotal = 3,
  onBack,
  onAnswer,
  onContinue,
  speakText = speak,
}: LessonListeningScreenProps) {
  const [state, setState] = useState<LessonChoiceState>('ready')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const progress = lessonProgressPercent(todayDone, todayTotal)
  const targetVisible = shouldRevealListeningTarget(state)

  useEffect(() => {
    setState('ready')
    setSelectedId(null)
    const timer = window.setTimeout(() => speakText(word.word), 120)
    return () => window.clearTimeout(timer)
  }, [speakText, word.id, word.word])

  const choose = (option: LessonChoiceOption) => {
    if (state === 'correct') return
    const nextState = judgeLessonChoice(option.id, correctOptionId)
    setSelectedId(option.id)
    setState(nextState)
    onAnswer({ selectedId: option.id, correct: nextState === 'correct' })
  }

  useEffect(() => {
    const testWindow = window as Window & {
      render_game_to_text?: () => string
      advanceTime?: (ms: number) => void
    }
    testWindow.render_game_to_text = () => JSON.stringify({
      coordinateSystem: '1194x834 logical stage; origin top-left; x right; y down',
      screen: `lesson_listening_${state}`,
      audioTarget: word.word,
      targetVisible,
      options: options.map((option) => ({ id: option.id, label: option.label })),
      selectedId,
      progress: { done: todayDone, total: todayTotal, question: questionIndex, questionTotal },
      controls: state === 'correct'
        ? ['back', 'replay_word', 'continue']
        : ['back', 'replay_word', ...options.map((option) => `answer_${option.id}`)],
    })
    testWindow.advanceTime = () => undefined
    return () => {
      delete testWindow.render_game_to_text
      delete testWindow.advanceTime
    }
  }, [options, questionIndex, questionTotal, selectedId, state, targetVisible, todayDone, todayTotal, word.word])

  return (
    <FarmStageShell ariaLabel="皮皮のEnglish 听音选择题">
      <div className={`lesson-choice-f4 lesson-listening-f4 is-${state}`}>
        <div className="lesson-choice-wash-f4" aria-hidden="true" />

        <header className="lesson-choice-header-f4">
          <button className="lesson-choice-back-f4" type="button" onClick={onBack}><span aria-hidden="true" />回农场</button>
          <section className="lesson-choice-progress-f4" aria-label={`今日学习进度 ${todayDone} / ${todayTotal}`}>
            <div className="lesson-choice-progress-copy-f4"><strong>听一听 · 第 {questionIndex} 题 / {questionTotal}</strong><span>今日进度 {todayDone} / {todayTotal}</span></div>
            <div className="lesson-choice-progress-path-f4">
              <span className="lesson-choice-progress-fill-f4" style={{ width: `${progress}%` }} />
              <span className="lesson-choice-progress-dot-f4 is-done" /><span className="lesson-choice-progress-dot-f4 is-current" />
              <span className="lesson-choice-progress-dot-f4" /><span className="lesson-choice-progress-dot-f4" />
            </div>
            <img className="lesson-choice-progress-hen-f4" src={f4AssetUrl('mother-f3.png')} alt="母鸡妈妈正在向终点走" />
          </section>
          <span className="lesson-choice-step-chip-f4">听一听 · 会重试</span>
        </header>

        <section className="lesson-choice-paper-f4">
          <div className="lesson-choice-heading-f4">
            <div><p>LISTEN AND PICK</p><h1>听一听，它是什么意思？</h1><span>听清楚以后，再选一个答案。</span></div>
            <button className="lesson-choice-word-f4 lesson-listening-prompt-f4" type="button" onClick={() => speakText(word.word)} aria-label="播放题目单词">
              {targetVisible ? (
                <span className="lesson-listening-reveal-f4"><strong>{word.word}</strong>{word.ipa && <small>{word.ipa}</small>}<SoundBars /></span>
              ) : (
                <span className="lesson-listening-ready-f4"><SoundBars /><strong>播放单词</strong><small>可以多听几遍</small></span>
              )}
            </button>
          </div>

          <div className="lesson-choice-grid-f4" role="group" aria-label="请选择听到的单词对应的中文意思">
            {options.map((option, index) => {
              const isSelected = selectedId === option.id
              const className = [
                'lesson-choice-option-f4',
                state === 'correct' && option.id === correctOptionId ? 'is-correct' : '',
                state === 'retry' && isSelected ? 'is-wrong' : '',
              ].filter(Boolean).join(' ')
              return (
                <button
                  className={className}
                  key={option.id}
                  type="button"
                  disabled={state === 'correct'}
                  aria-pressed={isSelected}
                  onClick={() => choose(option)}
                >
                  <span>{String.fromCharCode(65 + index)}</span><strong>{option.label}</strong>
                </button>
              )
            })}
          </div>

          <div className="lesson-choice-feedback-f4" role="status" aria-live="polite">
            {state === 'ready' && <div className="is-ready"><span className="lesson-listening-feedback-sound-f4"><i /><i /><i /></span><p><strong>先听，再选择</strong><small>没听清也没关系，可以多播放几遍。</small></p></div>}
            {state === 'correct' && <div className="is-correct"><span>✓</span><p><strong>听对啦！{word.word} 就是 {word.meaning}</strong><small>耳朵已经记住这个新朋友了。</small></p><button type="button" onClick={onContinue}>继续</button></div>}
            {state === 'retry' && <div className="is-retry"><span>↶</span><p><strong>差一点，再听一次</strong><small>先不看答案，听听声音再重新选。</small></p><button type="button" onClick={() => speakText(word.word)}>重听</button></div>}
          </div>
        </section>
      </div>
    </FarmStageShell>
  )
}
