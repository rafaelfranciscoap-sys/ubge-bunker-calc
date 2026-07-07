// Armas e perfis de dano contra bunkers — DADOS CONFIRMADOS do código-fonte aberto do
// foxholeplanner (brandon-ray/foxhole-facility-planner, public/games/foxhole/data.js), com a
// fórmula de "Bunker Destruction Stats" extraída de gui.js. Cross-checado com a wiki oficial
// (foxhole.wiki.gg) e com o print do painel "Selection Stats" do usuário.
//
// FÓRMULA (idêntica à do foxholeplanner):
//   hitsParaDestruir(tier) = ceil( maxHealth / ( damage × profile[tier] × drying × multiplier[tier] ) )
// onde:
//   - profile[tier]     = fração de dano que "passa" naquele tier de estrutura (= 1 − resistência).
//   - multiplier[tier]  = ajuste extra por tier (default 1).
//   - drying (só col. T3)= concreto molhado toma MAIS dano: recém-colocado ×10; seca linearmente
//                          (86400/tempo_s) até ×1 às 24h. "T3 wet" usa ×10; "T3 dry" usa ×1.
//
// VALIDAÇÃO (maxHealth = 13.791 do print): 150mm T1 = ceil(13791/(900×0.75)) = 21 ✓;
//   T3 dry = ceil(13791/(900×0.25)) = 62 ✓; T3 wet = ceil(13791/(900×0.25×10)) = 7 ✓.
//   68mm T3 dry = ceil(13791/(600×0.07)) = 329 ✓; T3 wet = 33 ✓.
//
// FONTE DE VERDADE ATUAL: datamine oficial "Foxhole Datamine (Update 65)", aba "Damage Profiles"
// (mitigação por tipo de dano × perfil de estrutura) e aba "Ammo" (dano por munição). A fração que
// PASSA = 1 − mitigação. Confirmado: Explosive/HighExplosive contra Tier{1,2,3}Structure =
// mitigação {0.25, 0.35, 0.75} → passa {0.75, 0.65, 0.25}; ArmourPiercing {0.75,0.75,0.93} →
// {0.25,0.25,0.07}; Demolition ignora estruturas (passa 1). Validado célula a célula contra o
// painel do usuário (13.791 hp): 150mm T2=24, Mortar T2=71, 30mm T2=54, 68mm T3 dry=329. Nada estimado.

// Shelter bonus — Artillery Shelter Room (foxhole.wiki.gg/wiki/Artillery_Shelter_Room).
// Reduz dano de High Explosive e Incendiary recebido pela rede. Retornos decrescentes por shelter.
// EXCEÇÃO: 300mm shells são imunes ao shelter bonus (bypassesShelter: true no weapon).
// fonte: wiki + datamine Update 65 (bAffectedByShelterBonus).
export const SHELTER_AFFECTED_TYPES = new Set(['High Explosive', 'Incendiary'])
// Bônus acumulado por número de Artillery Shelter Rooms (índice = quantidade, cap real = 23pp).
export const SHELTER_BONUS_BY_COUNT = [0, 0.15, 0.20, 0.22] as const

export type BunkerColumnKey = 't1' | 't2' | 't3_wet' | 't3_dry'

export const BUNKER_COLUMNS: { key: BunkerColumnKey; label: string; profileTier: 't1' | 't2' | 't3'; wet: boolean }[] = [
  { key: 't1', label: 'T1', profileTier: 't1', wet: false },
  { key: 't2', label: 'T2', profileTier: 't2', wet: false },
  { key: 't3_wet', label: 'T3 wet', profileTier: 't3', wet: true },
  { key: 't3_dry', label: 'T3 dry', profileTier: 't3', wet: false },
]

export type WeaponIconType = 'grenade' | 'round' | 'ap' | 'arty' | 'rocket' | 'satchel'

export interface Weapon {
  key: string
  /** Rótulo curto como no painel do foxholeplanner (ex.: "150mm", "HE Grenade"). */
  label: string
  damageTypeName: string
  damage: number
  /** Categoria de ícone visual para a tabela de destruição. */
  iconType: WeaponIconType
  /** Fração de dano por tier de estrutura (1 − resistência). */
  profiles: { t1: number; t2: number; t3: number }
  /** Ajuste extra por tier (default 1 quando ausente) — fator por-arma do foxholeplanner
   * (falloff/mecânica de explosão), confirmado por bater com o painel do usuário. */
  multipliers?: Partial<Record<'t1' | 't2' | 't3', number>>
  /** Breaching Modifier (datamine, aba Ammo) — multiplica o dano na fase de brecha. Default 1. */
  breachingModifier?: number
  /** true = munição colocada (satchel/tripé), não disparada por canhão — "recarga" não se aplica. */
  placed?: boolean
  /** true = ignora o shelter bonus do Artillery Shelter Room (ex.: 300mm). fonte: datamine. */
  bypassesShelter?: boolean
  /**
   * Override por-arma de bIgnoreBreachesBunkersThreshold (datamine, aba Damage Types).
   * Quando true: ignora o limiar de brecha — pode destruir peças imediatamente (como Demolition
   * Breaching). Quando false/ausente: usa o valor do DAMAGE_TYPE_BREACH para o tipo de dano.
   * Necessário porque múltiplos objetos de dano compartilham o mesmo display name — ex.: 300mm
   * usa BPHighExplosiveBreachingLeakDamageType (ignora limiar), não BPHighExplosiveDamageType.
   */
  ignoresBreachThreshold?: boolean
}

// Comportamento de brecha por TIPO de dano (display name).
// fonte: datamine Update 65, aba "Damage Types" (bBreachesBunkers / bIgnoreBreachesBunkersThreshold).
//
// ATENÇÃO: múltiplos objetos de dano compartilham o mesmo display name "Demolition"/"High Explosive".
// O valor de ignoresBreachThreshold abaixo é o DEFAULT para aquele display name; armas específicas
// podem ter ignoresBreachThreshold=true no campo Weapon para sobrescrever (ver weaponBreach()).
//
// Mapeamento datamine → display name:
//   BPDemolitionDamageType → "Demolition", ignoresThreshold=false (Hydra's, Alligator, 250mm Purity)
//   BPDemolitionBreachingDamageType → "Demolition", ignoresThreshold=true (Havoc, 250mm Fury)
//   BPHighExplosiveDamageType → "High Explosive", ignoresThreshold=false (Mortar)
//   BPHighExplosiveRuinDamageType → "High Explosive", ignoresThreshold=false (150mm, 120mm)
//   BPHighExplosiveBreachingLeakDamageType → "High Explosive", ignoresThreshold=true (300mm)
export interface DamageTypeBreach {
  breachesBunkers: boolean
  ignoresBreachThreshold: boolean
}
export const DAMAGE_TYPE_BREACH: Record<string, DamageTypeBreach> = {
  Explosive: { breachesBunkers: true, ignoresBreachThreshold: false },
  'High Explosive': { breachesBunkers: true, ignoresBreachThreshold: false },
  Demolition: { breachesBunkers: true, ignoresBreachThreshold: false },
  'Armour Piercing': { breachesBunkers: false, ignoresBreachThreshold: false },
}

export function weaponBreach(weapon: Weapon): DamageTypeBreach {
  const base = DAMAGE_TYPE_BREACH[weapon.damageTypeName] ?? { breachesBunkers: false, ignoresBreachThreshold: false }
  if (weapon.ignoresBreachThreshold !== undefined) {
    return { ...base, ignoresBreachThreshold: weapon.ignoresBreachThreshold }
  }
  return base
}

// Multiplicador de secagem do concreto (T3): molhado (recém-construído) toma 10× dano.
export const WET_CONCRETE_DRYING_MULTIPLIER = 10
// Tempo total de cura (segundos) — a partir daí o concreto está "dry" (×1). fonte: gui.js/wiki.
export const CONCRETE_FULL_CURE_SECONDS = 86400

const EXPLOSIVE_PROFILE = { t1: 0.75, t2: 0.65, t3: 0.25 }
const AP_PROFILE = { t1: 0.25, t2: 0.25, t3: 0.07 }
const DEMOLITION_PROFILE = { t1: 1, t2: 1, t3: 1 }

// Ordem espelha o painel "Bunker Destruction Stats" do foxholeplanner.
// Dados confirmados do datamine Update 65 (aba Ammo + Damage Types + Damage Profiles).
export const WEAPONS: Weapon[] = [
  // ── Explosivos leves ─────────────────────────────────────────────────────────
  { key: 'hegrenade', label: 'HE Grenade', iconType: 'grenade', damageTypeName: 'Explosive', damage: 240, profiles: EXPLOSIVE_PROFILE, multipliers: { t2: 0.95, t3: 0.95 } },
  { key: 'helauncher', label: 'HE Launcher', iconType: 'grenade', damageTypeName: 'Explosive', damage: 400, profiles: EXPLOSIVE_PROFILE, multipliers: { t2: 0.95, t3: 0.95 } },
  // ── Munição de veículo / canhão ──────────────────────────────────────────────
  { key: '30mm', label: '30mm', iconType: 'round', damageTypeName: 'Explosive', damage: 400, profiles: EXPLOSIVE_PROFILE, multipliers: { t2: 0.99, t3: 0.99 } },
  { key: 'rpg', label: 'RPG', iconType: 'round', damageTypeName: 'Explosive', damage: 550, profiles: EXPLOSIVE_PROFILE, multipliers: { t3: 0.99 } },
  { key: '40mm', label: '40mm', iconType: 'round', damageTypeName: 'Explosive', damage: 600, profiles: EXPLOSIVE_PROFILE },
  { key: '75mm', label: '75mm', iconType: 'round', damageTypeName: 'Explosive', damage: 1750, profiles: EXPLOSIVE_PROFILE },
  // ── Armour Piercing ──────────────────────────────────────────────────────────
  { key: '68mm', label: '68mm', iconType: 'ap', damageTypeName: 'Armour Piercing', damage: 600, profiles: AP_PROFILE },
  { key: '94.5mm', label: '94.5mm', iconType: 'ap', damageTypeName: 'Armour Piercing', damage: 1750, profiles: AP_PROFILE },
  // ── Artilharia (HE) ──────────────────────────────────────────────────────────
  { key: 'mortar', label: 'Mortar', iconType: 'arty', damageTypeName: 'High Explosive', damage: 300, profiles: EXPLOSIVE_PROFILE },
  { key: '120mm', label: '120mm', iconType: 'arty', damageTypeName: 'High Explosive', damage: 400, profiles: EXPLOSIVE_PROFILE },
  { key: '150mm', label: '150mm', iconType: 'arty', damageTypeName: 'High Explosive', damage: 900, profiles: EXPLOSIVE_PROFILE },
  // Rocket (3C-High Explosive Rocket) — BPHighExplosiveFalloffDamageType, afetado por shelter.
  { key: 'rocket', label: 'Rocket', iconType: 'rocket', damageTypeName: 'High Explosive', damage: 700, profiles: EXPLOSIVE_PROFILE },
  // Fire Rocket (4C-Fire Rocket) — BPIncendiaryHighExplosiveDamageType. Perfil idêntico ao HE
  // (Tier1/2/3Structure mig = 0.25/0.35/0.75), afetado por shelter, NÃO brecha bunkers.
  { key: 'firerocket', label: 'Fire Rocket', iconType: 'rocket', damageTypeName: 'Incendiary', damage: 145, profiles: EXPLOSIVE_PROFILE },
  // Shatter Missile — BPDemolitionBreachingFalloffDamageType: ignora limiar de brecha.
  { key: 'shattermissile', label: 'Shatter Missile', iconType: 'rocket', damageTypeName: 'Demolition', damage: 250, profiles: DEMOLITION_PROFILE, ignoresBreachThreshold: true },
  // Hydra's usa BPDemolitionDamageType: NÃO ignora limiar de brecha.
  { key: 'hydras', label: "Hydra's", iconType: 'rocket', damageTypeName: 'Demolition', damage: 550, profiles: DEMOLITION_PROFILE, breachingModifier: 1.2 },
  // Raidbreaker (Mark II Raidbreaker) — BPHighExplosiveRuinDamageType, afetado por shelter.
  { key: 'raidbreaker', label: 'Raidbreaker', iconType: 'arty', damageTypeName: 'High Explosive', damage: 1200, profiles: EXPLOSIVE_PROFILE },
  // ── Artilharia de cerco ───────────────────────────────────────────────────────
  // 250mm "Fury" usa BPDemolitionBreachingDamageType: ignora limiar de brecha.
  { key: '250mm-fury', label: '250mm (Fury)', iconType: 'satchel', damageTypeName: 'Demolition', damage: 800, profiles: DEMOLITION_PROFILE, ignoresBreachThreshold: true },
  // 250mm "Purity" usa BPDemolitionDamageType: NÃO ignora limiar (precisa de fase 1).
  { key: '250mm-purity', label: '250mm (Purity)', iconType: 'satchel', damageTypeName: 'Demolition', damage: 800, profiles: DEMOLITION_PROFILE },
  // 300mm usa BPHighExplosiveBreachingLeakDamageType: ignora limiar E bypassa shelter.
  { key: '300mm', label: '300mm', iconType: 'arty', damageTypeName: 'High Explosive', damage: 3000, profiles: EXPLOSIVE_PROFILE, bypassesShelter: true, ignoresBreachThreshold: true },
  // ── Cargas de demolição ───────────────────────────────────────────────────────
  // Alligator usa BPDemolitionDamageType: NÃO ignora limiar de brecha.
  { key: 'alligator', label: 'Alligator', iconType: 'satchel', damageTypeName: 'Demolition', damage: 550, profiles: DEMOLITION_PROFILE, breachingModifier: 3, placed: true },
  // Havoc usa BPDemolitionBreachingDamageType: ignora limiar de brecha.
  { key: 'havoc', label: 'Havoc Charge', iconType: 'satchel', damageTypeName: 'Demolition', damage: 1950, profiles: DEMOLITION_PROFILE, breachingModifier: 3, placed: true, ignoresBreachThreshold: true },
]
