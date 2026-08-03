import { describe, expect, it } from 'vitest'
import { WEAPONS, weaponBreach } from '../data/weapons'
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
  // Bunker do exemplo de import: HP total 18.940, vida de brecha (breachable/fase 2) 6.882.
  // A brecha só abre depois de REMOVER (HP total − vida de brecha) = 12.058 HP — essa é a fase 1.
  const HP = 18940
  const BREACHABLE = 6882
  const PHASE1_HP = HP - BREACHABLE // 12.058 — HP a remover antes do breach abrir

  it('HE (150mm) brecha só após o limiar; duas fases somam a destruição total', () => {
    const o = breachOutcome(HP, PHASE1_HP, weapon('150mm'), 't3_dry')
    expect(o.canBreach).toBe(true)
    expect(o.ignoresThreshold).toBe(false)
    // fase 1: 12058/225 = 53.6 → 54 acertos até abrir a brecha
    expect(o.hitsToOpenBreach).toBe(54)
    // 54 acertos entregam 12.150 (92 de excedente sobre o limiar); sobram 6.790, não 6.882
    // → ceil(6790/225) = 31. Total 85, igual a ceil(18940/225).
    expect(o.hitsToDestroy).toBe(85)
  })

  // Regressão: o tiro que cruza o limiar quase sempre passa dele, e esse excedente é dano já
  // dado. Descontar o limiar cheio em vez do dano entregue arredondava para cima duas vezes e
  // inflava o total em 1 — o painel esquerdo dizia 283 onde a tabela de destruição dizia 282.
  it('carrega o excedente da fase 1 para a fase 2 (sem arredondar duas vezes)', () => {
    // Caso real reportado: 28.189 HP, 16.5% breach após 23.544 HP, 120mm a 100/tiro.
    const hp = 28189
    const phase1Hp = 23544 // = 28.189 − 4.645 de breachable
    const o = breachOutcome(hp, phase1Hp, weapon('120mm'), 't3_dry')
    expect(o.hitsToOpenBreach).toBe(236) // ceil(23544/100)
    // 236 × 100 = 23.600 entregues → sobram 4.589 → ceil(4589/100) = 46, não 47
    expect(o.hitsToDestroy).toBe(282)
  })

  // Invariante: quando o breaching modifier é 1, a fase 2 não bate mais forte que a fase 1,
  // então o total TEM de ser idêntico ao da tabela de destruição. Se as duas telas divergirem
  // de novo, este teste quebra.
  // Agora que o modifier saiu do dano, a invariante vale para TODA arma que brecha, incluindo
  // Havoc, Alligator e Hydra's. Se alguém reintroduzir o modifier no caminho de dano, quebra aqui.
  it('para toda arma que brecha, o total bate exatamente com hitsToDestroy da tabela', () => {
    const cases = [
      { hp: 28189, phase1: 23544 },
      { hp: 18940, phase1: 12058 },
      { hp: 24221, phase1: 17383 },
      { hp: 13791, phase1: 8000 },
    ]
    const breachers = WEAPONS.filter((w) => weaponBreach(w).breachesBunkers)
    expect(breachers.some((w) => (w.breachingModifier ?? 1) !== 1)).toBe(true) // cobre os ×1.2/×3
    for (const weap of breachers) {
      for (const col of ['t1', 't2', 't3_dry', 't3_wet'] as const) {
        for (const { hp, phase1 } of cases) {
          expect(breachOutcome(hp, phase1, weap, col).hitsToDestroy).toBe(
            hitsToDestroy(hp, weap, col),
          )
        }
      }
    }
  })

  it('AP (68mm) NÃO brecha estruturas → destruição impossível (Infinity)', () => {
    const o = breachOutcome(HP, PHASE1_HP, weapon('68mm'), 't3_dry')
    expect(o.canBreach).toBe(false)
    expect(o.hitsToDestroy).toBe(Infinity)
    expect(o.hitsToOpenBreach).toBe(Infinity)
  })

  it('250mm Fury (DemolitionBreaching) ignora o limiar → brecha imediata (0 acertos até abrir)', () => {
    const o = breachOutcome(HP, PHASE1_HP, weapon('250mm (Fury)'), 't3_dry')
    expect(o.ignoresThreshold).toBe(true)
    expect(o.hitsToOpenBreach).toBe(0)
    // 18940/800 = 23.7 → 24
    expect(o.hitsToDestroy).toBe(24)
  })

  // O Breaching Modifier multiplica a CHANCE de brechar, não o dano (wiki oficial: Shatter
  // Missile tem "decreased chance of causing a Breach (x0.7)"). Então ele é exposto no
  // resultado como informação, mas não entra na conta de acertos.
  it('Havoc Charge expõe o breaching modifier sem aplicá-lo ao dano', () => {
    const o = breachOutcome(HP, PHASE1_HP, weapon('Havoc Charge'), 't3_dry')
    expect(o.breachingModifier).toBe(3)
    // O ×3 fica só como informação de chance. Dano continua 1950/carga (Demolition passa 100%),
    // então 18940/1950 = 9.71 → 10 cargas. Antes dávamos 4, dividindo o dano por 3 sem base.
    expect(o.hitsToDestroy).toBe(10)
  })
})

// Janela de cura = 18h (64800s) — datamine Update 65, "Concrete Settle Duration Mins" = 1080.
// A saturação no ×10 passa a valer abaixo de 64800/10 = 6480s (1.8h).
describe('concreteDryingMultiplier', () => {
  it('recém-construído (< 1.8h) satura em ×10', () => {
    expect(concreteDryingMultiplier(0)).toBe(10)
    expect(concreteDryingMultiplier(3600)).toBe(10)
  })

  it('decai como 64800/tempo entre 1.8h e 18h', () => {
    expect(concreteDryingMultiplier(43200)).toBeCloseTo(1.5) // 12h → ×1.5
    expect(concreteDryingMultiplier(28800)).toBeCloseTo(2.25) // 8h → ×2.25
    expect(concreteDryingMultiplier(6480)).toBeCloseTo(10) // 1.8h → limite do platô
  })

  it('curado (>= 18h) é ×1', () => {
    expect(concreteDryingMultiplier(64800)).toBe(1)
    expect(concreteDryingMultiplier(86400)).toBe(1) // 24h: já curado há muito
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
