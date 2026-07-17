export interface LessonFinishSummary {
  newWords: number
  reviews: number
  streakDays: number
  eggsEarned: number
}

function wholeNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

export function normalizeLessonFinishSummary(summary: LessonFinishSummary): LessonFinishSummary {
  return {
    newWords: wholeNonNegative(summary.newWords),
    reviews: wholeNonNegative(summary.reviews),
    streakDays: wholeNonNegative(summary.streakDays),
    eggsEarned: wholeNonNegative(summary.eggsEarned),
  }
}
