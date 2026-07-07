import { describe, expect, it } from 'vitest'
import type { ArtilleryRound } from '../data/damage'
import type { BunkerGraph } from './structuralIntegrity'
import {
  calculateSiege,
  computeEffectiveDamage,
  computeEffectiveResistance,
  computeEffectiveShelterCountForPiece,
  computeEstimatedTimeSeconds,
  computeShotsUntilBreach,
  computeShotsUntilDestroy,
  computeStormCannonExpectedShotsUntilBreach,
} from './siegeCalculator'

const ROUND_120MM: ArtilleryRound = {
  caliber: '120mm',
  heDamage: 400,
  fullDamageRadius: 4,
  falloffRadius: 11.25,
  alwaysBreachChance: null,
  ignoresBreachableHealth: false,
}

const ROUND_STORM_CANNON: ArtilleryRound = {
  caliber: '300mm (Storm Cannon)',
  heDamage: null,
  fullDamageRadius: null,
  falloffRadius: null,
  alwaysBreachChance: 0.25,
  ignoresBreachableHealth: true,
}

describe('computeEffectiveResistance', () => {
  it('is just the base tier resistance with 0 shelters', () => {
    expect(computeEffectiveResistance('T3', 0)).toBeCloseTo(0.75)
  })

  it('adds the cumulative shelter bonus', () => {
    expect(computeEffectiveResistance('T3', 1)).toBeCloseTo(0.9)
    expect(computeEffectiveResistance('T3', 2)).toBeCloseTo(0.95)
    expect(computeEffectiveResistance('T3', 3)).toBeCloseTo(0.97)
  })
})

describe('computeEffectiveDamage', () => {
  it('scales base HE damage by (1 - resistance)', () => {
    expect(computeEffectiveDamage(ROUND_120MM, 0.75)).toBeCloseTo(100)
  })

  it('is null when the round has no confirmed HE damage', () => {
    expect(computeEffectiveDamage(ROUND_STORM_CANNON, 0.75)).toBeNull()
  })
})

describe('computeShotsUntilBreach / computeShotsUntilDestroy', () => {
  it('rounds up to the next whole shot', () => {
    expect(computeShotsUntilBreach(1000, 300)).toBe(4)
    expect(computeShotsUntilDestroy(1000, 300)).toBe(4)
  })

  it('the "pegadinha": shared island HP + a single piece resistance', () => {
    // Duas peças no mesmo bunker island, uma T3 sem shelter e outra T3 com 3 shelters —
    // o dano por tiro muda conforme a peça-alvo, mas o HP compartilhado é o mesmo da ilha.
    const totalHp = 9000
    const damageAgainstUnshielded = computeEffectiveDamage(
      ROUND_120MM,
      computeEffectiveResistance('T3', 0),
    )!
    const damageAgainstShielded = computeEffectiveDamage(
      ROUND_120MM,
      computeEffectiveResistance('T3', 3),
    )!

    expect(damageAgainstUnshielded).toBeGreaterThan(damageAgainstShielded)
    expect(computeShotsUntilDestroy(totalHp, damageAgainstUnshielded)).toBeLessThan(
      computeShotsUntilDestroy(totalHp, damageAgainstShielded),
    )
  })
})

describe('computeEstimatedTimeSeconds', () => {
  it('divides shots by (guns / cadence)', () => {
    // 10 tiros, 2 canhões, 5s de cadência cada -> 0.4 tiros/s -> 25s
    expect(computeEstimatedTimeSeconds(10, 2, 5)).toBeCloseTo(25)
  })
})

describe('computeStormCannonExpectedShotsUntilBreach', () => {
  it('is 1 / chance for a fixed-probability round', () => {
    expect(computeStormCannonExpectedShotsUntilBreach(ROUND_STORM_CANNON)).toBeCloseTo(4)
  })

  it('is null for rounds that do not ignore Breachable Health', () => {
    expect(computeStormCannonExpectedShotsUntilBreach(ROUND_120MM)).toBeNull()
  })
})

describe('calculateSiege', () => {
  it('computes the full pipeline for a normal round', () => {
    const result = calculateSiege({
      tier: 'T3',
      shelterCount: 0,
      round: ROUND_120MM,
      totalHp: 9000,
      breachableHealth: 1200,
      attackingGuns: 2,
      cadenceSeconds: 6.2,
    })

    expect(result.effectiveResistance).toBeCloseTo(0.75)
    expect(result.effectiveDamage).toBeCloseTo(100)
    expect(result.shotsUntilBreach).toBe(12)
    expect(result.shotsUntilDestroy).toBe(90)
    expect(result.stormCannon).toBeNull()
  })

  it('ignores resistance/Breachable Health for the Storm Cannon', () => {
    const result = calculateSiege({
      tier: 'T3',
      shelterCount: 3,
      round: ROUND_STORM_CANNON,
      totalHp: 9000,
      breachableHealth: 1200,
      attackingGuns: 1,
      cadenceSeconds: 6.2,
    })

    expect(result.shotsUntilBreach).toBeNull()
    expect(result.shotsUntilDestroy).toBeNull()
    expect(result.stormCannon).not.toBeNull()
    expect(result.stormCannon!.breachChancePerShot).toBeCloseTo(0.25)
    expect(result.stormCannon!.expectedShotsUntilBreach).toBeCloseTo(4)
  })
})

describe('computeEffectiveShelterCountForPiece', () => {
  // grafo: shelter -- corner(triangle) -- target ; e um square isolado "far" que não conecta.
  const graph: BunkerGraph = {
    pieces: [
      { id: 'shelter', edgeModifier: 0.9, totalDots: 4 },
      { id: 'corner', edgeModifier: 0.9, totalDots: 3 },
      { id: 'target', edgeModifier: 0.9, totalDots: 4 },
      { id: 'blocker', edgeModifier: 0.9, totalDots: 4 },
      { id: 'beyondBlocker', edgeModifier: 0.9, totalDots: 4 },
    ],
    connections: [
      { pieceIdA: 'shelter', pieceIdB: 'corner' },
      { pieceIdA: 'corner', pieceIdB: 'target' },
      { pieceIdA: 'shelter', pieceIdB: 'blocker' },
      { pieceIdA: 'blocker', pieceIdB: 'beyondBlocker' },
    ],
  }
  const shapeById = new Map<string, 'square' | 'triangle'>([
    ['shelter', 'square'],
    ['corner', 'triangle'],
    ['target', 'square'],
    ['blocker', 'square'],
    ['beyondBlocker', 'square'],
  ])

  it('propagates through a corner (triangle) piece', () => {
    expect(
      computeEffectiveShelterCountForPiece(graph, shapeById, ['shelter'], 'target'),
    ).toBe(1)
  })

  it('does not propagate past a square piece', () => {
    expect(
      computeEffectiveShelterCountForPiece(graph, shapeById, ['shelter'], 'beyondBlocker'),
    ).toBe(0)
  })

  it('still buffs a direct square neighbor of the shelter', () => {
    expect(
      computeEffectiveShelterCountForPiece(graph, shapeById, ['shelter'], 'blocker'),
    ).toBe(1)
  })

  it('caps the count at 3 shelters', () => {
    const manyShelterGraph: BunkerGraph = {
      pieces: [
        { id: 's1', edgeModifier: 0.9, totalDots: 4 },
        { id: 's2', edgeModifier: 0.9, totalDots: 4 },
        { id: 's3', edgeModifier: 0.9, totalDots: 4 },
        { id: 's4', edgeModifier: 0.9, totalDots: 4 },
        { id: 'target', edgeModifier: 0.9, totalDots: 4 },
      ],
      connections: [
        { pieceIdA: 's1', pieceIdB: 'target' },
        { pieceIdA: 's2', pieceIdB: 'target' },
        { pieceIdA: 's3', pieceIdB: 'target' },
        { pieceIdA: 's4', pieceIdB: 'target' },
      ],
    }
    const manyShapeById = new Map<string, 'square' | 'triangle'>([
      ['s1', 'square'],
      ['s2', 'square'],
      ['s3', 'square'],
      ['s4', 'square'],
      ['target', 'square'],
    ])
    expect(
      computeEffectiveShelterCountForPiece(
        manyShelterGraph,
        manyShapeById,
        ['s1', 's2', 's3', 's4'],
        'target',
      ),
    ).toBe(3)
  })
})
