export interface ArtilleryRound {
  caliber: string
  heDamage: number | null
  fullDamageRadius: number | null
  falloffRadius: number | null
  alwaysBreachChance: number | null
  ignoresBreachableHealth: boolean
}

// fonte: wiki oficial (foxhole.wiki.gg) — dano de impacto direto de artilharia
export const ARTILLERY_ROUNDS: ArtilleryRound[] = [
  {
    caliber: '120mm',
    heDamage: 400,
    fullDamageRadius: 4,
    falloffRadius: 11.25,
    alwaysBreachChance: null,
    ignoresBreachableHealth: false,
  },
  {
    caliber: '150mm',
    heDamage: 900,
    fullDamageRadius: 7,
    falloffRadius: 11.25,
    alwaysBreachChance: null,
    ignoresBreachableHealth: false,
  },
  {
    caliber: '300mm (Storm Cannon)',
    heDamage: null, // TODO: confirmar na wiki — HE do Storm Cannon não informado na fonte
    fullDamageRadius: null, // TODO: confirmar na wiki
    falloffRadius: null, // TODO: confirmar na wiki
    alwaysBreachChance: 0.25,
    ignoresBreachableHealth: true,
  },
]

export type BunkerTier = 'T1' | 'T2' | 'T3'

// fonte: especificação da Fase 1 (documento de origem não informado — TODO: confirmar referência exata na wiki)
export const EXPLOSIVE_RESISTANCE_BY_TIER: Record<BunkerTier, number> = {
  T1: 0.25,
  T2: 0.35,
  T3: 0.75,
}

export interface ArtyShelterBonusStep {
  shelterCount: number
  incrementalBonus: number
  cumulativeBonus: number
}

// fonte: especificação da Fase 1 (documento de origem não informado — TODO: confirmar referência exata na wiki)
// Bônus só se aplica a peças adjacentes ao shelter; propaga por cantos mas não atravessa quadrados
// (regra de topologia — a lógica de propagação pertence à camada /src/engine, não aos dados).
export const ARTY_SHELTER_BONUS_STEPS: ArtyShelterBonusStep[] = [
  { shelterCount: 1, incrementalBonus: 0.15, cumulativeBonus: 0.15 },
  { shelterCount: 2, incrementalBonus: 0.05, cumulativeBonus: 0.20 },
  { shelterCount: 3, incrementalBonus: 0.02, cumulativeBonus: 0.22 },
]

// fonte: especificação da Fase 1 (documento de origem não informado — TODO: confirmar referência exata na wiki)
// Mecânica de brecha: abaixo do Breachable Health (BH%), toda arma explosiva tem chance de
// 0% a 25% de causar brecha por acerto, crescendo conforme o HP cai. A curva exata entre os
// extremos não foi especificada — TODO: confirmar na wiki. Storm Cannon (300mm) ignora o BH
// e usa sempre os 25% fixos definidos em ARTILLERY_ROUNDS (alwaysBreachChance).
export const BREACH_CHANCE_MIN = 0
export const BREACH_CHANCE_MAX = 0.25

// ---------------------------------------------------------------------------
// Selection Stats — tabela "Bunker Destruction Stats" (arma × tier)
// ---------------------------------------------------------------------------

export interface DestructionTierColumn {
  key: 'T1' | 'T2' | 'T3_wet' | 'T3_dry'
  label: string
  /** Resistência a explosivo da coluna. `null` = não confirmada empiricamente — coluna bloqueada. */
  explosiveResistance: number | null
  /** Se o Raw HP das peças nesse tier está confirmado (sem ele não há HP de seleção para dividir). */
  rawHpConfirmed: boolean
  /** Motivo do bloqueio exibido na UI quando a coluna não é computável. */
  blockedReason: string | null
}

// Regra de ouro: nenhum valor estimado. O 0.75 de EXPLOSIVE_RESISTANCE_BY_TIER.T3 vem da
// Fase 1 SEM distinguir concreto curado (dry) de molhado (wet) — atribuí-lo a uma das duas
// colunas seria assumir. Ambas ficam bloqueadas até teste empírico dizer a qual estado o
// 0.75 pertence e qual é o valor do outro. A UI ainda mostra uma linha informativa com o
// valor T3 vigente (não atribuído), calculada a partir de EXPLOSIVE_RESISTANCE_BY_TIER.
export const DESTRUCTION_TIER_COLUMNS: DestructionTierColumn[] = [
  {
    key: 'T1',
    label: 'T1',
    explosiveResistance: EXPLOSIVE_RESISTANCE_BY_TIER.T1,
    rawHpConfirmed: false, // TODO: confirmar empiricamente Raw HP por peça em T1
    blockedReason: 'Raw HP T1 não confirmado',
  },
  {
    key: 'T2',
    label: 'T2',
    explosiveResistance: EXPLOSIVE_RESISTANCE_BY_TIER.T2,
    rawHpConfirmed: false, // TODO: confirmar empiricamente Raw HP por peça em T2
    blockedReason: 'Raw HP T2 não confirmado',
  },
  {
    key: 'T3_wet',
    label: 'T3 wet',
    explosiveResistance: null, // TODO: confirmar empiricamente resistência de concreto molhado
    rawHpConfirmed: true,
    blockedReason: 'Resistência wet não confirmada',
  },
  {
    key: 'T3_dry',
    label: 'T3 dry',
    explosiveResistance: null, // TODO: confirmar empiricamente se o 0.75 vigente é wet ou dry
    rawHpConfirmed: true,
    blockedReason: 'Não confirmado se 0.75 é wet ou dry',
  },
]
