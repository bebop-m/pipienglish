export interface LessonChoiceOption {
  id: string
  label: string
}

export type LessonChoiceState = 'ready' | 'correct' | 'retry'

/** 选择题只按稳定选项 id 判定；视觉层永远只消费中文 label。 */
export function judgeLessonChoice(selectedId: string, correctId: string): Exclude<LessonChoiceState, 'ready'> {
  return selectedId === correctId ? 'correct' : 'retry'
}

export function selectedChoiceLabel(options: LessonChoiceOption[], selectedId: string | null): string | null {
  if (!selectedId) return null
  return options.find((option) => option.id === selectedId)?.label ?? null
}
