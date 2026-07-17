export const RESCUE_STAGES = ['intro', 'trace', 'choice', 'dictation'] as const

export type RescueStage = (typeof RESCUE_STAGES)[number]

export function normalizeRescueStage(stage: unknown): RescueStage {
  return RESCUE_STAGES.includes(stage as RescueStage) ? stage as RescueStage : 'intro'
}

export function nextRescueStage(stage: RescueStage): RescueStage | null {
  const index = RESCUE_STAGES.indexOf(stage)
  return index >= 0 && index < RESCUE_STAGES.length - 1 ? RESCUE_STAGES[index + 1] : null
}

export function rescueStageIndex(stage: RescueStage): number {
  return RESCUE_STAGES.indexOf(stage) + 1
}

export function normalizeRescueAnswer(value: string): string {
  return value.trim().normalize('NFC').toLocaleLowerCase('en-US')
}
