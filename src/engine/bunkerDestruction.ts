import {
  BUNKER_COLUMNS,
  CONCRETE_FULL_CURE_SECONDS,
  SHELTER_AFFECTED_TYPES,
  SHELTER_BONUS_BY_COUNT,
  WET_CONCRETE_DRYING_MULTIPLIER,
  weaponBreach,
  type BunkerColumnKey,
  type Weapon,
} from '../data/weapons'

// Bônus de shelter em PONTOS PERCENTUAIS a subtrair do pass-through do tier.
// Modelo ADITIVO (confirmado pelo datamine e pelo vídeo de referência):
//   T3 base: 25% passa → +1 shelter: 25%-15pp = 10% passa → ×2.5 mais hits que sem shelter.
// Retorna 0 quando: nenhum shelter, tipo de dano não afetado, ou arma bypassa shelter (300mm).
export function shelterBonusPPForWeapon(weapon: Weapon, shelterCount: number): number {
  if (shelterCount <= 0) return 0
  if (weapon.bypassesShelter) return 0
  if (!SHELTER_AFFECTED_TYPES.has(weapon.damageTypeName)) return 0
  return SHELTER_BONUS_BY_COUNT[Math.min(shelterCount, SHELTER_BONUS_BY_COUNT.length - 1)]
}

// Multiplicador de secagem do concreto para a coluna T3, dado o tempo de cura decorrido (s).
// fonte: foxholeplanner gui.js — `this.time < 8640 ? 10 : 86400/this.time`, e ×1 quando curado.
// "wet" no painel = janela fresca (×10). Exposto para permitir uma futura linha do tempo de cura.
export function concreteDryingMultiplier(curingSeconds: number): number {
  if (curingSeconds >= CONCRETE_FULL_CURE_SECONDS) return 1
  // Abaixo de 8640s (2.4h) o multiplicador satura em 10; depois decai como 86400/tempo.
  if (curingSeconds < CONCRETE_FULL_CURE_SECONDS / WET_CONCRETE_DRYING_MULTIPLIER) {
    return WET_CONCRETE_DRYING_MULTIPLIER
  }
  return CONCRETE_FULL_CURE_SECONDS / curingSeconds
}

// Dano efetivo por acerto de uma arma numa coluna de tier/estado.
// shelterBonusPP: pontos percentuais a subtrair do pass-through (modelo aditivo).
//   Use shelterBonusPPForWeapon() para obter o valor correto por arma.
export function effectiveDamagePerHit(
  weapon: Weapon,
  column: BunkerColumnKey,
  shelterBonusPP = 0,
): number {
  const col = BUNKER_COLUMNS.find((c) => c.key === column)!
  const profile = weapon.profiles[col.profileTier]
  const multiplier = weapon.multipliers?.[col.profileTier] ?? 1
  const drying = col.wet ? WET_CONCRETE_DRYING_MULTIPLIER : 1
  const adjustedProfile = Math.max(0, profile - shelterBonusPP)
  return weapon.damage * adjustedProfile * drying * multiplier
}

// Acertos para remover uma dada quantidade de vida (destruir ou brechar).
// Infinity quando o dano efetivo é 0 (perfil nulo) — nunca dividimos por zero.
export function hitsForHealth(
  health: number,
  weapon: Weapon,
  column: BunkerColumnKey,
  shelterBonusPP = 0,
): number {
  const effectiveDamage = effectiveDamagePerHit(weapon, column, shelterBonusPP)
  if (effectiveDamage <= 0 || health <= 0) return Infinity
  return Math.ceil(health / effectiveDamage)
}

// hits para destruir a seleção com uma arma numa dada coluna de tier (dano bruto, sem
// considerar a mecânica de brecha — usado na tabela de referência de throughput).
export function hitsToDestroy(
  maxHealth: number,
  weapon: Weapon,
  column: BunkerColumnKey,
): number {
  return hitsForHealth(maxHealth, weapon, column)
}

// ---------------------------------------------------------------------------
// MODELO DE BRECHA REAL (datamine Update 65 — Damage Types + Ammo Breaching Modifier)
// ---------------------------------------------------------------------------
//
// Mecânica: uma rede de bunker compartilha HP. Acima do "limiar de brecha" (= HP_max × integridade),
// nenhuma peça pode ser destruída — só se reduz o HP compartilhado. Para BRECHAR (destruir peças) o
// dano precisa ser de um tipo que brecha (Explosive/HighExplosive/Demolition; AP e cinéticos NÃO) e
// a rede precisa estar abaixo do limiar — EXCETO Demolition, que ignora o limiar e brecha de cara.
// Na fase de brecha o dano é multiplicado pelo Breaching Modifier da munição.

export interface BreachOutcome {
  /** A arma consegue brechar estruturas? (AP/cinético = false) */
  canBreach: boolean
  /** Ignora o limiar de brecha? (Demolition) */
  ignoresThreshold: boolean
  breachingModifier: number
  /** Acertos até abrir a brecha (levar a rede ao limiar). 0 se ignora o limiar; ∞ se não brecha. */
  hitsToOpenBreach: number
  /** Acertos até destruir tudo, já considerando fases + breaching modifier. ∞ se não brecha. */
  hitsToDestroy: number
}

export function breachOutcome(
  maxHealth: number,
  /** HP a remover na fase 1 antes do breach abrir (= SI × maxHP = breachHpAbsolute do import).
   *  NÃO é HP restante — é a quantidade de dano necessária para chegar ao limiar. */
  phase1Hp: number,
  weapon: Weapon,
  column: BunkerColumnKey,
  shelterBonusPP = 0,
): BreachOutcome {
  const breach = weaponBreach(weapon)
  const modifier = weapon.breachingModifier ?? 1
  const perHit = effectiveDamagePerHit(weapon, column, shelterBonusPP)

  if (!breach.breachesBunkers || perHit <= 0 || maxHealth <= 0) {
    return {
      canBreach: breach.breachesBunkers,
      ignoresThreshold: breach.ignoresBreachThreshold,
      breachingModifier: modifier,
      hitsToOpenBreach: breach.breachesBunkers ? 0 : Infinity,
      hitsToDestroy: Infinity,
    }
  }

  const breachPerHit = perHit * modifier

  if (breach.ignoresBreachThreshold) {
    // Brecha imediata (300mm / DemolitionBreaching): toda a destruição usa o modifier.
    return {
      canBreach: true,
      ignoresThreshold: true,
      breachingModifier: modifier,
      hitsToOpenBreach: 0,
      hitsToDestroy: Math.ceil(maxHealth / breachPerHit),
    }
  }

  // Explosive/HE/DemolitionDamageType: dois estágios.
  // Fase 1: remover phase1Hp de HP (= SI × maxHP) até o limiar de brecha.
  // Fase 2: destruir o restante (maxHealth − phase1Hp = (1−SI) × maxHP) com breaching modifier.
  const phase1 = phase1Hp > 0 ? Math.ceil(phase1Hp / perHit) : 0
  const hpInBreachPhase = Math.max(0, maxHealth - phase1Hp)
  const phase2 = hpInBreachPhase > 0 ? Math.ceil(hpInBreachPhase / breachPerHit) : 0
  return {
    canBreach: true,
    ignoresThreshold: false,
    breachingModifier: modifier,
    hitsToOpenBreach: phase1,
    hitsToDestroy: phase1 + phase2,
  }
}

// Linha da tabela: hits por coluna para uma arma (com shelter opcional).
export function weaponDestructionRow(
  maxHealth: number,
  weapon: Weapon,
  shelterBonusPP = 0,
): Record<BunkerColumnKey, number> {
  const row = {} as Record<BunkerColumnKey, number>
  for (const col of BUNKER_COLUMNS) {
    row[col.key] = hitsForHealth(maxHealth, weapon, col.key, shelterBonusPP)
  }
  return row
}

export type IntegrityClass = 'high' | 'medium' | 'low' | 'critical'

// Classe de integridade exibida no painel. fonte: foxholeplanner gui.js
// (>=0.75 high, >=0.5 medium, >=0.25 low, senão critical).
export function integrityClass(structuralIntegrity: number): IntegrityClass {
  if (structuralIntegrity >= 0.75) return 'high'
  if (structuralIntegrity >= 0.5) return 'medium'
  if (structuralIntegrity >= 0.25) return 'low'
  return 'critical'
}
