import { describe, expect, it } from 'vitest'
import {
  computeFoxbunkerIntegrity,
  findFoxbunkerStructure,
  FOXBUNKER_STRUCTURES,
} from './foxbunkerReference'

describe('FOXBUNKER_STRUCTURES (dados confirmados do foxbunker.com)', () => {
  it('tem os modificadores de aresta REAIS por peça em T3 (não os quadrados do pair-test)', () => {
    // Estes eram os valores que o projeto guardava ao quadrado em confirmedEdgeModifier:
    // Blank 0.97 (projeto tinha 0.941 = 0.97²), Rifle 0.86 (0.740 = 0.86²),
    // Artillery Shelter 0.82 (0.672 = 0.82²).
    expect(findFoxbunkerStructure('Blank')!.tiers[2]!.edgeModifier).toBe(0.97)
    expect(findFoxbunkerStructure('Rifle Garrison')!.tiers[2]!.edgeModifier).toBe(0.86)
    expect(findFoxbunkerStructure('Artillery Shelter')!.tiers[2]!.edgeModifier).toBe(0.82)
  })

  it('tem Raw HP de T1 e T2 (antes bloqueados no projeto)', () => {
    const blank = findFoxbunkerStructure('Blank')!
    expect(blank.tiers[0]!.rawHp).toBe(750) // T1
    expect(blank.tiers[1]!.rawHp).toBe(2000) // T2
    expect(blank.tiers[2]!.rawHp).toBe(3750) // T3
  })

  it('marca peças não construíveis em certos tiers como null (ex.: Engine Room não tem T1)', () => {
    expect(findFoxbunkerStructure('Engine Room')!.tiers[0]).toBeNull()
    expect(FOXBUNKER_STRUCTURES).toHaveLength(21)
  })
})

describe('computeFoxbunkerIntegrity (fórmula confirmada — aditiva e limitada)', () => {
  it('força 100% de integridade para peça única (size 1)', () => {
    expect(computeFoxbunkerIntegrity([0.86], 0, 4).integFinalPercent).toBe(100)
  })

  it('reproduz o exemplo do print do foxbunker: produto 56.6% + bônus 7.1% = 63.7%', () => {
    // 9/19 dots verdes → bônus bruto = 15 × 9/19 = 7.105%. Produto de aresta = 56.6%.
    const result = computeFoxbunkerIntegrity([0.566, 1.0], 9, 19)
    expect(result.integProductPercent).toBeCloseTo(56.6, 1)
    expect(result.effBonusPercent).toBeCloseTo(7.1, 1)
    expect(result.integFinalPercent).toBeCloseTo(63.7, 1)
  })

  it('soma o bônus (não multiplica) e limita ao mínimo entre bônus bruto, (100−produto) e produto', () => {
    // Dois Blank (0.97) conectados: produto 94.09%, verdes 2/8 → bônus bruto 3.75%,
    // limitado por (100−94.09)=5.91 e 94.09 → 3.75; final 97.84%.
    const two = computeFoxbunkerIntegrity([0.97, 0.97], 2, 8)
    expect(two.integProductPercent).toBeCloseTo(94.09, 2)
    expect(two.effBonusPercent).toBeCloseTo(3.75, 2)
    expect(two.integFinalPercent).toBeCloseTo(97.84, 2)

    // Produto alto: bônus bruto seria 15% mas o cap (100−98=2) domina → final 100%.
    const capped = computeFoxbunkerIntegrity([0.98, 1.0], 8, 8)
    expect(capped.effBonusPercent).toBeCloseTo(2, 5)
    expect(capped.integFinalPercent).toBe(100)
  })
})
