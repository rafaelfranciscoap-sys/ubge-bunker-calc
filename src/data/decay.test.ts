import { describe, expect, it } from 'vitest'
import { DECAY_BY_TIER, inferTierFromImport, totalDecayHours } from './decay'

describe('inferTierFromImport (Raw HP médio por peça)', () => {
  it('infere T3 do bunker do exemplo (18.940 hp, 8 peças, 63.7% integ ≈ 3.717/peça)', () => {
    expect(inferTierFromImport(18940, 8, 63.7)).toBe('T3')
  })

  it('infere T2 (~2000 de Raw HP por peça)', () => {
    // 4 peças × 2000 × 0.9 = 7200
    expect(inferTierFromImport(7200, 4, 90)).toBe('T2')
  })

  it('infere T1 (~750 de Raw HP por peça)', () => {
    // 4 peças × 750 × 1.0 = 3000
    expect(inferTierFromImport(3000, 4, 100)).toBe('T1')
  })

  it('devolve null quando faltam dados', () => {
    expect(inferTierFromImport(null, 8, 63.7)).toBeNull()
    expect(inferTierFromImport(18940, null, 63.7)).toBeNull()
  })
})

describe('totalDecayHours', () => {
  it('soma início + duração (T3 = 75 + 45 = 120h)', () => {
    expect(totalDecayHours('T3')).toBe(120)
    expect(totalDecayHours('T2')).toBe(DECAY_BY_TIER.T2.startHours + DECAY_BY_TIER.T2.durationHours)
  })
})
