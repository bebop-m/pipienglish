import { useEffect, useState } from 'react'
import { speak } from '../../application/services/tts'
import { f4AssetUrl } from '../farm-f4/assetUrl'
import { FarmStageShell } from '../farm-f4/visual/FarmStageShell'
import { lessonProgressPercent, type LessonIntroWord } from './lessonIntroModel'
import {
  dictationInputForState,
  judgeDictationAnswer,
  type LessonDictationState,
} from './lessonDictationModel'
import '../../styles/f4/lesson-choice.css'
import '../../styles/f4/lesson-dictation.css'

export interface LessonDictationAnswer {
  value: string
  correct: boolean
}

export interface LessonDictationForgot {
  wordId: string
}

export interface LessonDictationScreenProps {
  word: LessonIntroWord
  todayDone: number
  todayTotal: number
  questionIndex?: number
  questionTotal?: number
  headerTitle?: string
  progressText?: string
  stepChip?: string
  allowForgot?: boolean
  onBack: () => void
  onAnswer: (answer: LessonDictationAnswer) => void
  onForgot?: (forgot: LessonDictationForgot) => void
  onContinue: () => void
  onCapturedContinue: () => void
  speakText?: (text: string) => boolean
  /** 仅供受控视觉回归入口使用；孩子可见流程保持默认 ready。 */
  initialState?: LessonDictationState
}

function SoundBars() {
  return <span className="lesson-choice-sound-f4" aria-hidden="true"><i /><i /><i /></span>
}

export function LessonDictationScreen({
  word,
  todayDone,
  todayTotal,
  questionIndex = 1,
  questionTotal = 3,
  headerTitle,
  progressText,
  stepChip,
  allowForgot = true,
  onBack,
  onAnswer,
  onForgot,
  onContinue,
  onCapturedContinue,
  speakText = speak,
  initialState = 'ready',
}: LessonDictationScreenProps) {
  const [state, setState] = useState<LessonDictationState>(initialState)
  const [input, setInput] = useState(() => dictationInputForState(initialState, word.word))
  const progress = lessonProgressPercent(todayDone, todayTotal)

  useEffect(() => {
    setState(initialState)
    setInput(dictationInputForState(initialState, word.word))
  }, [initialState, word.id, word.word])

  const submit = () => {
    if (!input.trim() || state === 'correct' || state === 'captured') return
    const nextState = judgeDictationAnswer(input, word.word)
    setState(nextState)
    onAnswer({ value: input, correct: nextState === 'correct' })
  }

  const forgot = () => {
    if (!allowForgot || state === 'correct' || state === 'captured') return
    setInput('')
    setState('captured')
    onForgot?.({ wordId: word.id })
  }

  useEffect(() => {
    const testWindow = window as Window & {
      render_game_to_text?: () => string
      advanceTime?: (ms: number) => void
    }
    testWindow.render_game_to_text = () => JSON.stringify({
      coordinateSystem: '1194x834 logical stage; origin top-left; x right; y down',
      screen: `lesson_dictation_${state}`,
      meaning: word.meaning,
      answerVisible: state === 'correct',
      inputValue: state === 'captured' ? '' : input,
      inputMode: 'standard text; keyboard or system handwriting input',
      wrongBookQueued: state === 'captured',
      chickCaptured: state === 'captured',
      rescueRoute: state === 'captured' ? ['listen', 'write', 'choose', 'dictate'] : null,
      header: {
        title: headerTitle ?? `默写 · 第 ${questionIndex} 题 / ${questionTotal}`,
        progressText: progressText ?? `今日进度 ${todayDone} / ${todayTotal}`,
        stepChip: stepChip ?? '写一写 · 会重试',
      },
      progress: { done: todayDone, total: todayTotal, question: questionIndex, questionTotal },
      controls: state === 'captured'
        ? ['back', 'continue_next']
        : state === 'correct'
          ? ['back', 'continue']
          : ['back', 'replay_word', 'input_answer', 'submit_answer', ...(allowForgot ? ['skip_unknown'] : [])],
    })
    testWindow.advanceTime = () => undefined
    return () => {
      delete testWindow.render_game_to_text
      delete testWindow.advanceTime
    }
  }, [allowForgot, headerTitle, input, progressText, questionIndex, questionTotal, state, stepChip, todayDone, todayTotal, word.meaning])

  return (
    <FarmStageShell ariaLabel="皮皮のEnglish 英文默写题">
      <div className={`lesson-choice-f4 lesson-dictation-f4 is-${state}`}>
        <div className="lesson-choice-wash-f4" aria-hidden="true" />

        <header className="lesson-choice-header-f4">
          <button className="lesson-choice-back-f4" type="button" onClick={onBack}><span aria-hidden="true" />回农场</button>
          <section className="lesson-choice-progress-f4" aria-label={`今日学习进度 ${todayDone} / ${todayTotal}`}>
            <div className="lesson-choice-progress-copy-f4"><strong>{headerTitle ?? `默写 · 第 ${questionIndex} 题 / ${questionTotal}`}</strong><span>{progressText ?? `今日进度 ${todayDone} / ${todayTotal}`}</span></div>
            <div className="lesson-choice-progress-path-f4">
              <span className="lesson-choice-progress-fill-f4" style={{ width: `${progress}%` }} />
              <span className="lesson-choice-progress-dot-f4 is-done" /><span className="lesson-choice-progress-dot-f4 is-done" />
              <span className="lesson-choice-progress-dot-f4 is-done" /><span className="lesson-choice-progress-dot-f4 is-current" />
            </div>
            <img className="lesson-choice-progress-hen-f4" src={f4AssetUrl('mother-f3.png')} alt="母鸡妈妈正在向终点走" />
          </section>
          <span className="lesson-choice-step-chip-f4">{stepChip ?? '写一写 · 会重试'}</span>
        </header>

        <section className="lesson-choice-paper-f4 lesson-dictation-paper-f4">
          <div className="lesson-dictation-heading-f4">
            <div><p>LISTEN AND WRITE</p><h1>把这个单词写出来</h1><span>可以用键盘，也可以用系统手写输入。</span></div>
            <button className="lesson-dictation-prompt-f4" type="button" onClick={() => speakText(word.word)} aria-label="播放题目单词">
              <span><small>它的意思是</small><strong>{word.meaning}</strong></span><SoundBars />
            </button>
          </div>

          {state === 'captured' ? (
            <section className="lesson-dictation-captured-f4" aria-live="polite">
              <div className="lesson-dictation-rescue-visual-f4">
                <img src={f4AssetUrl('chick-f3.png')} alt="一只等待救援的小鸡" />
                <span>等待救援</span>
              </div>
              <div className="lesson-dictation-rescue-copy-f4">
                <p>RESCUE MISSION</p><h2>一只小鸡被抓走了</h2>
                <span>“{word.meaning}”已经进入错题库。去救援时，这个词会单独重新走一遍学习路线。</span>
                <button type="button" onClick={onCapturedContinue}>先做下一题</button>
              </div>
            </section>
          ) : (
            <>
              <div className="lesson-dictation-answer-f4">
                <label htmlFor="lesson-dictation-answer">输入英文答案</label>
                <input
                  id="lesson-dictation-answer"
                  value={input}
                  readOnly={state === 'correct'}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  placeholder="在这里写英文"
                  onChange={(event) => {
                    setInput(event.target.value)
                    if (state === 'retry') setState('ready')
                  }}
                  onKeyDown={(event) => { if (event.key === 'Enter') submit() }}
                />
                {state !== 'ready' && <span className="lesson-dictation-state-icon-f4" aria-hidden="true">{state === 'correct' ? '✓' : '↶'}</span>}
              </div>

              <div className="lesson-dictation-feedback-f4" role="status" aria-live="polite">
                {state === 'ready' && <div className="is-ready"><span>✎</span><p><strong>想好以后再提交</strong><small>大小写都可以，系统会按正常英文判断。</small></p>{allowForgot && <button type="button" onClick={forgot}>想不起来</button>}</div>}
                {state === 'correct' && <div className="is-correct"><span>✓</span><p><strong>写对啦！{word.word} 就是 {word.meaning}</strong><small>这个新朋友已经会写了。</small></p><button type="button" onClick={onContinue}>继续</button></div>}
                {state === 'retry' && <div className="is-retry"><span>↶</span><p><strong>差一点，再写一次</strong><small>{allowForgot ? '先修改答案；实在想不起来，也可以跳过。' : '修改答案，再试一次。'}</small></p>{allowForgot && <button type="button" onClick={forgot}>想不起来</button>}</div>}
              </div>

              {state !== 'correct' && <div className="lesson-dictation-actions-f4">
                <button className="is-replay" type="button" onClick={() => speakText(word.word)}><SoundBars />重听</button>
                <button className="is-submit" type="button" onClick={submit}>提交答案</button>
              </div>}
            </>
          )}
        </section>
      </div>
    </FarmStageShell>
  )
}
