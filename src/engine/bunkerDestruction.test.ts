import { describe, expect, it } from 'vitest'
import { WEAPONS } from '../data/weapons'
import {
  breachOutcome,
  concreteDryingMultiplier,
  hitsToDestroy,
  integrityClass,
  weaponDestructionRow,
} from './bunkerDestruction'

// maxHealth do print do usuário (foxholeplanner v3.5.0, painel Selection Stats).
const MAX_HEALTH = 13791
const weapon = (label: string) => WEAPONS.find((w) => w.label === label)!

describe('hitsToDestroy — reproduz o painel do foxholeplanner', () => {
  it('150mm (HE): T1=21, T3 dry=62, T3 wet=7 (exatos do print)', () => {
    const w = weapon('150mm')
    expect(hitsToDestroy(MAX_HEALTH, w, 't1')).toBe(21)
    expect(hitsToDestroy(MAX_HEALTH, w, 't3_dry')).toBe(62)
    expect(hitsToDestroy(MAX_HEALTH, w, 't3_wet')).toBe(7)
  })

  it('68mm (AP): T1=92, T3 dry=329, T3 wet=33 (exatos do print)', () => {
    const w = weapon('68mm')
    expect(hitsToDestroy(MAX_HEALTH, w, 't1')).toBe(92)
    expect(hitsToDestroy(MAX_HEALTH, w, 't3_dry')).toBe(329)
    expect(hitsToDestroy(MAX_HEALTH, w, 't3_wet')).toBe(33)
  })

  it('94.5mm (AP): T1=32, T3 dry=113, T3 wet=12 (exatos do print)', () => {
    const w = weapon('94.5mm')
    expect(hitsToDestroy(MAX_HEALTH, w, 't1')).toBe(32)
    expect(hitsToDestroy(MAX_HEALTH, w, 't3_dry')).toBe(113)
    expect(hitsToDestroy(MAX_HEALTH, w, 't3_wet')).toBe(12)
  })

  it('120mm (HE): T1=46, T3 dry=138 (exatos do print)', () => {
    const w = weapon('120mm')
    expect(hitsToDestroy(MAX_HEALTH, w, 't1')).toBe(46)
    expect(hitsToDestroy(MAX_HEALTH, w, 't3_dry')).toBe(138)
  })

  // T2 confirmado pelo datamine Update 65 (Explosive/HE mitigação 0.35 → passa 0.65).
  // Antes ficava com ressalva de versão; agora bate exato com o painel do usuário.
  it('coluna T2 bate com o painel (datamine Update 65: passa 0.65)', () => {
    expect(hitsToDestroy(MAX_HEALTH, weapon('150mm'), 't2')).toBe(24)
    expect(hitsToDestroy(MAX_HEALTH, weapon('120mm'), 't2')).toBe(54)
    expect(hitsToDestroy(MAX_HEALTH, weapon('Mortar'), 't2')).toBe(71)
    expect(hitsToDestroy(MAX_HEALTH, weapon('30mm'), 't2')).toBe(54)
    expect(hitsToDestroy(MAX_HEALTH, weapon('HE Grenade'), 't2')).toBe(94)
    expect(hitsToDestroy(MAX_HEALTH, weapon('68mm'), 't2')).toBe(92) // AP: T2 inalterado
  })

  it('T3 wet é ~10× mais fácil que T3 dry (concreto molhado toma 10× dano)', () => {
    const row = weaponDestructionRow(MAX_HEALTH, weapon('150mm'))
    expect(row.t3_dry / row.t3_wet).toBeGreaterThan(8)
  })

  it('devolve Infinity para HP zero', () => {
    expect(hitsToDestroy(0, weapon('150mm'), 't1')).toBe(Infinity)
  })
})

describe('breachOutcome — modelo de brecha real (datamine Update 65)', () => {
  // Bunker do exemplo de import: HP total 18.940, vida de brecha 6.882.
  const HP = 18940
  const BREACHABLE = 6882

  it('HE (150mm) brecha só após o limiar; duas fases somam a destruição total', () => {
    const o = breachOutcome(HP, BREACHABLE, weapon('150mm'), 't3_dry')
    expect(o.canBreach).toBe(true)
    expect(o.ignoresThreshold).toBe(false)
    // fase 1: 6882/225 = 30.6 → 31 acertos até abrir a brecha
    expect(o.hitsToOpenBreach).toBe(31)
    // total: 31 + ceil(12058/225)=54 → 85
    expect(o.hitsToDestroy).toBe(85)
  })

  it('AP (68mm) NÃO brecha estruturas → destruição impossível (Infinity)', () => {
    const o = breachOutcome(HP, BREACHABLE, weapon('68mm'), 't3_dry')
    expect(o.canBreach).toBe(false)
    expect(o.hitsToDestroy).toBe(Infinity)
    expect(o.hitsToOpenBreach).toBe(Infinity)
  })

  it('250mm Fury (DemolitionBreaching) ignora o limiar → brecha imediata (0 acertos até abrir)', () => {
    const o = breachOutcome(HP, BREACHABLE, weapon('250mm (Fury)'), 't3_dry')
    expect(o.ignoresThreshold).toBe(true)
    expect(o.hitsToOpenBreach).toBe(0)
    // 18940/800 = 23.7 → 24
    expect(o.hitsToDestroy).toBe(24)
  })

  it('Havoc Charge (Demolition ×3) aplica o breaching modifier', () => {
    const o = breachOutcome(HP, BREACHABLE, weapon('Havoc Charge'), 't3_dry')
    expect(o.breachingModifier).toBe(3)
    // 1950 × 3 = 5850 por carga; 18940/5850 = 3.24 → 4 cargas
    expect(o.hitsToDestroy).toBe(4)
  })
})

describe('concreteDryingMultiplier', () => {
  it('recém-construído (< 2.4h) satura em ×10', () => {
    expect(concreteDryingMultiplier(0)).toBe(10)
    expect(concreteDryingMultiplier(3600)).toBe(10)
  })

  it('decai como 86400/tempo entre 2.4h e 24h', () => {
    expect(concreteDryingMultiplier(43200)).toBeCloseTo(2) // 12h → ×2
    expect(concreteDryingMultiplier(28800)).toBeCloseTo(3) // 8h → ×3
  })

  it('curado (>= 24h) é ×1', () => {
    expect(concreteDryingMultiplier(86400)).toBe(1)
    expect(concreteDryingMultiplier(999999)).toBe(1)
  })
})

describe('integrityClass', () => {
  it('classifica como no foxholeplanner (62% = medium)', () => {
    expect(integrityClass(0.62)).toBe('medium')
    expect(integrityClass(0.8)).toBe('high')
    expect(integrityClass(0.3)).toBe('low')
    expect(integrityClass(0.1)).toBe('critical')
  })
})
