import { describe, expect, it } from 'vitest'
import { bunkerHealth, compactBonus, integrityProduct, COMPACT_BONUS_MAX } from './bunkerHealth'

// Helper: n peças iguais.
const repeat = (value: number, times: number) => Array.from({ length: times }, () => value)

describe('bunkerHealth — reproduz os casos de referência', () => {
  // Caso 1 e 2: os dois painéis da apresentação de mecânicas (3×3 de peças T2, 12/24 conexões).
  // O segundo troca uma peça comum (0.97) por um Artillery Shelter (0.82).
  it('3×3 T2 sem shelter → 15.034 HP', () => {
    const r = bunkerHealth(repeat(2000, 9), repeat(0.97, 9), 12, 24)
    expect(r.rawHp).toBe(18000)
    expect(r.integrity).toBeCloseTo(0.7602310587, 9) // 0.97^9
    expect(r.bonus).toBeCloseTo(0.075, 9) // 12/24 × 0.15
    expect(r.finalHp).toBe(15034)
  })

  it('3×3 T2 com 1 Artillery Shelter → 12.918 HP (a troca custa 2.116 HP)', () => {
    const withShelter = bunkerHealth(repeat(2000, 9), [...repeat(0.97, 8), 0.82], 12, 24)
    expect(withShelter.integrity).toBeCloseTo(0.6426695547, 9) // 0.97^8 × 0.82
    expect(withShelter.finalHp).toBe(12918)

    const without = bunkerHealth(repeat(2000, 9), repeat(0.97, 9), 12, 24)
    expect(without.finalHp - withShelter.finalHp).toBe(2116)
  })

  // Caso 3, independente dos anteriores: bunker real importado pelo usuário do foxbunker.
  //   "28,189hp (83.5% integ, size 9)" / "76.0%+7.5% integ (12/24)"
  // 9 peças T3 comuns (3750 cada). Valida a fórmula contra um dado que não veio da mesma fonte.
  it('3×3 T3 real do foxbunker → 28.189 HP, e bate com o card linha a linha', () => {
    const r = bunkerHealth(repeat(3750, 9), repeat(0.97, 9), 12, 24)
    expect(r.rawHp).toBe(33750)
    // card: "76.0%" = produto das integridades
    expect(Number((r.integrity * 100).toFixed(1))).toBe(76.0)
    // card: "+7.5%" = bônus de compactação
    expect(Number((r.bonus * 100).toFixed(1))).toBe(7.5)
    // card: "83.5% integ" = a soma dos dois
    expect(Number((r.totalMultiplier * 100).toFixed(1))).toBe(83.5)
    expect(r.finalHp).toBe(28189)
  })
})

describe('integrityProduct — decaimento exponencial', () => {
  it('multiplica peça a peça', () => {
    expect(integrityProduct([0.97, 0.97, 0.82])).toBeCloseTo(0.97 * 0.97 * 0.82, 10)
  })

  it('bunker vazio vale 1 (elemento neutro)', () => {
    expect(integrityProduct([])).toBe(1)
  })

  it('crescer castiga exponencialmente', () => {
    expect(integrityProduct(repeat(0.97, 9))).toBeCloseTo(0.7602, 4)
    expect(integrityProduct(repeat(0.97, 20))).toBeCloseTo(0.5438, 4)
    expect(integrityProduct(repeat(0.97, 40))).toBeCloseTo(0.2957, 4)
  })
})

describe('compactBonus — resgate linear e limitado', () => {
  it('zero conexões não dá bônus', () => {
    expect(compactBonus(0, 24)).toBe(0)
  })

  it('metade das conexões dá metade do teto', () => {
    expect(compactBonus(12, 24)).toBeCloseTo(COMPACT_BONUS_MAX / 2, 10)
  })

  it('todas as conexões dão o teto, e não passa dele', () => {
    expect(compactBonus(24, 24)).toBeCloseTo(COMPACT_BONUS_MAX, 10)
    expect(compactBonus(99, 24)).toBeCloseTo(COMPACT_BONUS_MAX, 10)
  })

  it('não quebra com denominador zero', () => {
    expect(compactBonus(5, 0)).toBe(0)
  })
})
