import { useEffect, useState } from 'react'
import { speak } from '../../application/services/tts'
import { f4AssetUrl } from '../farm-f4/assetUrl'
import { FarmStageShell } from '../farm-f4/visual/FarmStageShell'
import { lessonProgressPercent, type LessonIntroWord } from './lessonIntroModel'
import {
  judgeLessonChoice,
  selectedChoiceLabel,
  type LessonChoiceOption,
  type LessonChoiceState,
} from './lessonChoiceModel'
import '../../styles/f4/lesson-choice.css'

export interface LessonChoiceAnswer {
  selectedId: string
  correct: boolean
}

export interface LessonChoiceScreenProps {
  word: LessonIntroWord
  options: LessonChoiceOption[]
  correctOptionId: string
  todayDone: number
  todayTotal: number
  stepIndex?: number
  stepTotal?: number
  onBack: () => void
  onAnswer: (answer: LessonChoiceAnswer) => void
  onContinue: () => void
  speakText?: (text: string) => boolean
}

function SoundBars() {
  return <span className="lesson-choice-sound-f4" aria-hidden="true"><i /><i /><i /></span>
}

export function LessonChoiceScreen({
  word,
  options,
  correctOptionId,
  todayDone,
  todayTotal,
  stepIndex = 3,
  stepTotal = 3,
  onBack,
  onAnswer,
  onContinue,
  speakText = speak,
}: LessonChoiceScreenProps) {
  const [state, setState] = useState<LessonChoiceState>('ready')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const progress = lessonProgressPercent(todayDone, todayTotal)
  const selectedLabel = selectedChoiceLabel(options, selectedId)

  useEffect(() => {
    setState('ready')
    setSelectedId(null)
  }, [word.id])

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
      screen: `lesson_choice_${state}`,
      word: word.word,
      prompt: '这个单词是什么意思？',
      options: options.map((option) => ({ id: option.id, label: option.label })),
      selectedId,
      selectedLabel,
      progress: { done: todayDone, total: todayTotal, step: stepIndex, stepTotal },
      controls: state === 'correct'
        ? ['back', 'replay_word', 'continue']
        : ['back', 'replay_word', ...options.map((option) => `answer_${option.id}`)],
    })
    testWindow.advanceTime = () => undefined
    return () => {
      delete testWindow.render_game_to_text
      delete testWindow.advanceTime
    }
  }, [options, selectedId, selectedLabel, state, stepIndex, stepTotal, todayDone, todayTotal, word.word])

  return (
    <FarmStageShell ariaLabel="皮皮のEnglish 中文释义选择题">
      <div className={`lesson-choice-f4 is-${state}`}>
        <div className="lesson-choice-wash-f4" aria-hidden="true" />

        <header className="lesson-choice-header-f4">
          <button className="lesson-choice-back-f4" type="button" onClick={onBack}><span aria-hidden="true" />回农场</button>
          <section className="lesson-choice-progress-f4" aria-label={`今日学习进度 ${todayDone} / ${todayTotal}`}>
            <div className="lesson-choice-progress-copy-f4"><strong>新朋友 · 第 {stepIndex} 步 / {stepTotal}</strong><span>今日进度 {todayDone} / {todayTotal}</span></div>
            <div className="lesson-choice-progress-path-f4">
              <span className="lesson-choice-progress-fill-f4" style={{ width: `${progress}%` }} />
              <span className="lesson-choice-progress-dot-f4 is-done" /><span className="lesson-choice-progress-dot-f4 is-done" />
              <span className="lesson-choice-progress-dot-f4 is-current" /><span className="lesson-choice-progress-dot-f4" />
            </div>
            <img className="lesson-choice-progress-hen-f4" src={f4AssetUrl('mother-f3.png')} alt="母鸡妈妈正在向终点走" />
          </section>
          <span className="lesson-choice-step-chip-f4">选一选 · 会重试</span>
        </header>

        <section className="lesson-choice-paper-f4">
          <div className="lesson-choice-heading-f4">
            <div><p>PICK THE MEANING</p><h1>这个单词是什么意思？</h1><span>选一个你觉得对的，不用着急。</span></div>
            <button className="lesson-choice-word-f4" type="button" onClick={() => speakText(word.word)} aria-label={`播放单词 ${word.word}`}>
              <span><strong>{word.word}</strong>{word.ipa && <small>{word.ipa}</small>}</span><SoundBars />
            </button>
          </div>

          <div className="lesson-choice-grid-f4" role="group" aria-label={`请选择 ${word.word} 的中文意思`}>
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
            {state === 'ready' && <div className="is-ready"><span>?</span><p><strong>选一个答案吧</strong><small>想再听一遍，可以点上面的 {word.word}。</small></p></div>}
            {state === 'correct' && <div className="is-correct"><span>✓</span><p><strong>答对啦！{word.word} 就是 {word.meaning}</strong><small>新朋友已经记住你啦。</small></p><button type="button" onClick={onContinue}>继续</button></div>}
            {state === 'retry' && <div className="is-retry"><span>↶</span><p><strong>差一点，再选一次</strong><small>{word.word} 不是 {selectedLabel ?? '这个答案'}。可以先听听它的声音。</small></p><button type="button" onClick={() => speakText(word.word)}>重听</button></div>}
          </div>
        </section>
      </div>
    </FarmStageShell>
  )
}
