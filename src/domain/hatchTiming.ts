import { HATCH_MS } from './types'

export function hatchesAt(placedAt: number): number {
  return placedAt + HATCH_MS
}

export function isHatchDue(placedAt: number, now: number): boolean {
  return now >= hatchesAt(placedAt)
}

export function remainingHatchMs(placedAt: number, now: number): number {
  return Math.max(0, hatchesAt(placedAt) - now)
}
