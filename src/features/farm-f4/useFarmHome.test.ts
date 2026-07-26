import { describe, expect, it } from 'vitest'
import type { FarmChickVM } from '../../application/viewmodel'
import { chicksVisibleDuringHatchReveal } from './useFarmHome'

const chicks = [
  { chickId: 'older-chick' },
  { chickId: 'revealing-chick' },
] as FarmChickVM[]

describe('hatch reveal visibility gate', () => {
  it('keeps the revealing chick off the grass across repeated core refreshes', () => {
    const reveal = { chickId: 'revealing-chick', sceneId: 'scene-1' }

    expect(chicksVisibleDuringHatchReveal(chicks, 'scene-1', reveal).map(chick => chick.chickId))
      .toEqual(['older-chick'])
    expect(chicksVisibleDuringHatchReveal(chicks, 'scene-1', reveal).map(chick => chick.chickId))
      .toEqual(['older-chick'])
    expect(chicks.map(chick => chick.chickId)).toEqual(['older-chick', 'revealing-chick'])
  })

  it('does not hide the chick while another scene is being viewed or after reveal completes', () => {
    const reveal = { chickId: 'revealing-chick', sceneId: 'scene-1' }

    expect(chicksVisibleDuringHatchReveal(chicks, 'scene-2', reveal)).toBe(chicks)
    expect(chicksVisibleDuringHatchReveal(chicks, 'scene-1', null)).toBe(chicks)
  })
})
