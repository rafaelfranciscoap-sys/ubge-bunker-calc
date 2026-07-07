import { describe, expect, it } from 'vitest'
import { computeHitsToDestroy, computeSelectionHealth } from './selectionStats'

describe('computeSelectionHealth', () => {
  it('scales the selected raw HP by the island structural integrity', () => {
    const stats = computeSelectionHealth([3750, 3750], 0.8, 20)
    expect(stats.selectionRawHp).toBe(7500)
    expect(stats.selectionMaxHealth).toBeCloseTo(6000)
    // Breachable = 20% do HP da seleção
    expect(stats.selectionBreachableHealth).toBeCloseTo(1200)
    expect(stats.islandStructuralIntegrity).toBe(0.8)
  })

  it('is zero for an empty selection', () => {
    const stats = computeSelectionHealth([], 0.8, 20)
    expect(stats.selectionMaxHealth).toBe(0)
    expect(stats.selectionBreachableHealth).toBe(0)
  })
})

describe('computeHitsToDestroy', () => {
  it('divides selection HP by effective damage, rounding up', () => {
    // 150mm (900 HE) contra T3 (0.75): dano efetivo = 225. 6000 / 225 = 26.67 → 27 hits.
    expect(computeHitsToDestroy(6000, 900, 0.75)).toBe(27)
  })

  it('returns Infinity when resistance nullifies the damage', () => {
    expect(computeHitsToDestroy(6000, 900, 1)).toBe(Infinity)
  })

  it('returns Infinity for an empty selection (0 HP)', () => {
    expect(computeHitsToDestroy(0, 900, 0.75)).toBe(Infinity)
  })
})
