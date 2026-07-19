import { useEffect, useRef, useState } from 'react'
import { speak } from '../../application/services/tts'
import { FarmStageShell } from '../farm-f4/visual/FarmStageShell'
import type { LessonIntroWord } from './lessonIntroModel'
import { LessonProgress } from './LessonProgress'
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
  headerTitle?: string
  progressText?: string
  stepChip?: string
  onBack: () => void
  onAnswer: (answer: LessonChoiceAnswer) => void | Promise<void>
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
  headerTitle,
  progressText,
  stepChip,
  onBack,
  onAnswer,
  onContinue,
  speakText = speak,
}: LessonChoiceScreenProps) {
  const [state, setState] = useState<LessonChoiceState>('ready')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const answerPending = useRef(false)
  const selectedLabel = selectedChoiceLabel(options, selectedId)

  useEffect(() => {
    setState('ready')
    setSelectedId(null)
    answerPending.current = false
  }, [word.id])

  const choose = async (option: LessonChoiceOption) => {
    if (state === 'correct' || answerPending.current) return
    answerPending.current = true
    const nextState = judgeLessonChoice(option.id, correctOptionId)
    setSelectedId(option.id)
    setState(nextState)
    try {
      await onAnswer({ selectedId: option.id, correct: nextState === 'correct' })
    } catch {
      setSelectedId(null)
      setState('ready')
    } finally {
      answerPending.current = false
    }
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
      header: {
        title: headerTitle ?? `新朋友 · 第 ${stepIndex} 步 / ${stepTotal}`,
        progressText: progressText ?? `今日进度 ${todayDone} / ${todayTotal}`,
        stepChip: stepChip ?? '选一选 · 会重试',
      },
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
  }, [headerTitle, options, progressText, selectedId, selectedLabel, state, stepChip, stepIndex, stepTotal, todayDone, todayTotal, word.word])

  return (
    <FarmStageShell ariaLabel="皮皮のEnglish 中文释义选择题">
      <div className={`lesson-choice-f4 is-${state}`}>
        <div className="lesson-choice-wash-f4" aria-hidden="true" />

        <header className="lesson-choice-header-f4">
          <button className="lesson-choice-back-f4" type="button" onClick={onBack}><span aria-hidden="true" />回农场</button>
          <LessonProgress
            variant="choice"
            title={headerTitle ?? `新朋友 · 第 ${stepIndex} 步 / ${stepTotal}`}
            progressText={progressText ?? `今日进度 ${todayDone} / ${todayTotal}`}
            done={todayDone}
            total={todayTotal}
          />
          <span className="lesson-choice-step-chip-f4">{stepChip ?? '选一选 · 会重试'}</span>
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
