import { describe, expect, it } from 'vitest'
import {
  computeBreachableHealth,
  computeBreachableHealthPercent,
  computeCompactBonus,
  computeDotBreakdown,
  computeMaxHealth,
  computeStructuralIntegrity,
  sumDotTotals,
  type BunkerGraph,
} from './structuralIntegrity'

describe('computeDotBreakdown', () => {
  it('marks dots green only where a piece is connected to another piece', () => {
    const graph: BunkerGraph = {
      pieces: [
        { id: 'a', edgeModifier: 0.97, totalDots: 4 },
        { id: 'b', edgeModifier: 0.97, totalDots: 4 },
        { id: 'c', edgeModifier: 0.86, totalDots: 3 },
      ],
      connections: [{ pieceIdA: 'a', pieceIdB: 'b' }],
    }

    const breakdown = computeDotBreakdown(graph)

    expect(breakdown).toEqual([
      { pieceId: 'a', totalDots: 4, greenDots: 1, redDots: 3 },
      { pieceId: 'b', totalDots: 4, greenDots: 1, redDots: 3 },
      { pieceId: 'c', totalDots: 3, greenDots: 0, redDots: 3 },
    ])
  })

  it('sums green/total dots across the whole bunker', () => {
    const graph: BunkerGraph = {
      pieces: [
        { id: 'a', edgeModifier: 0.97, totalDots: 4 },
        { id: 'b', edgeModifier: 0.97, totalDots: 4 },
      ],
      connections: [{ pieceIdA: 'a', pieceIdB: 'b' }],
    }

    expect(sumDotTotals(computeDotBreakdown(graph))).toEqual({ totalDots: 8, greenDots: 2 })
  })
})

describe('computeCompactBonus', () => {
  it('is 0.15 * (green dots / total dots)', () => {
    expect(computeCompactBonus(6, 20)).toBeCloseTo(0.045)
  })

  it('is 0 when there are no dots', () => {
    expect(computeCompactBonus(0, 0)).toBe(0)
  })
})

describe('computeStructuralIntegrity / computeMaxHealth / computeBreachableHealth*', () => {
  it('multiplies edge modifiers and applies the compact bonus', () => {
    const si = computeStructuralIntegrity([0.9, 0.9], 0)
    expect(si).toBeCloseTo(0.81)
  })

  it('scales the product up by the compact bonus factor', () => {
    const si = computeStructuralIntegrity([0.9, 0.9], 0.1)
    expect(si).toBeCloseTo(0.81 * 1.1)
  })

  it('Max Health is the sum of Raw HP times Structural Integrity', () => {
    expect(computeMaxHealth([1000, 500], 0.8)).toBeCloseTo(1200)
  })

  it('Breachable Health % is 100 * (1 - Structural Integrity)', () => {
    expect(computeBreachableHealthPercent(0.65)).toBeCloseTo(35)
  })

  it('Breachable Health is Max Health * Breachable Health %', () => {
    expect(computeBreachableHealth(1000, 35)).toBeCloseTo(350)
  })
})

// BLOQUEADO — ver conversa com o usuário (Fase 2).
//
// Exemplo real (print do foxbunker.com): 6 peças, 6 dots verdes, 20 dots totais,
// modificadores de aresta 0.97 x5, 0.82, 0.86 (7 valores para 6 peças).
// Esperado: Structural Integrity = 0.65, Max Health = 16867, Breachable Health = 35%.
//
// Não foi possível reproduzir esse resultado com a lógica e os dados disponíveis:
// 1) Nenhuma das leituras testadas para "7 modificadores em 6 peças" bate exatamente
//    com SI = 0.65 (a mais próxima, descartando um 0.97 duplicado, dá SI ≈ 0.6524,
//    que só bate por arredondamento).
// 2) O modelo edge/dot (src/data/pieces.ts) não tem Raw HP por peça — só modificador
//    de aresta. Para Max Health = 16867 com SI ≈ 0.65, a soma de Raw HP das 6 peças
//    precisaria ser ≈ 25950 (média ≈ 4325/peça), muito acima de qualquer valor da
//    tabela per-piece (máximo: Machine Gun Garrison T3 = 3000). Isso indica que falta
//    uma fonte de Raw HP específica do modelo edge/dot, ainda não fornecida.
//
// Não ajustamos os números para forçar o resultado — ver mensagem para o usuário.
it.todo('reproduces the foxbunker.com edge/dot validation example (blocked, needs clarification)')
