import type { LessonChoiceState } from './lessonChoiceModel'

/** 听音题只有答对后才允许把目标词形和音标放进孩子可见界面。 */
export function shouldRevealListeningTarget(state: LessonChoiceState): boolean {
  return state === 'correct'
}
