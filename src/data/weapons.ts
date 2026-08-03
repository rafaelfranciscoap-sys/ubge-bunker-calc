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
//   - drying (só col. T3)= concreto molhado toma MAIS dano: recém-colocado ×10; seca
//                          (64800/tempo_s) até ×1 às 18h. "T3 wet" usa ×10; "T3 dry" usa ×1.
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

// ── Artillery Shelter Room ────────────────────────────────────────────────────
//
// O QUE O DATAMINE (Update 65) DIZ, textualmente:
//   Structures (Bunkers) → FortArtilleryShelterT1/T2/T3:
//     "Base Shelter Bonus" = 0.15 (idêntico nos três tiers)
//     Structural Integrity = 0.82 (contra 0.97 de uma peça de bunker comum)
//     Max Health = igual à peça comum do tier (750 / 2000 / 3750)
//     Descrição: "A sheltered bunker that improves the resistance against artillery
//                 of ADJACENT bunkers at the cost of structural integrity."
//   Damage Types → bAffectedByShelterBonus = true só em HighExplosive e
//     IncendiaryHighExplosive. O 300mm escapa porque usa
//     BPHighExplosiveBreachingLeakDamageType, que NÃO tem a flag (bypassesShelter).
//
// O QUE O DATAMINE **NÃO** DIZ (varredura de todas as 36 abas, cabeçalhos e valores —
// existem exatamente 3 campos de shelter no arquivo inteiro):
//   1. Como o bônus ACUMULA com 2 ou 3 shelters. Só existe o 0.15 base.
//   2. O que "adjacent" significa em topologia — não há campo de raio, alcance
//      ou propagação em lugar nenhum.
//   3. Se existe teto.
//
// Portanto: dos valores abaixo, só o índice 1 (0.15) tem lastro em fonte primária.
// Os índices 2 e 3 vêm da mesma "especificação da Fase 1" sem origem registrada que
// alimenta src/data/damage.ts (lá marcada com TODO). Um comentário anterior aqui dizia
// "cap real = 23pp" enquanto os valores somam 22pp — os dois nunca bateram, e nenhum
// dos dois tem fonte. Mantidos como estão para não mudar número de jogo sem fonte, mas
// expostos como NÃO CONFIRMADOS via SHELTER_CONFIRMED_UP_TO para a UI poder sinalizar.
// TODO: confirmar 2º/3º shelter empiricamente in-game ou em fonte primária.
export const SHELTER_AFFECTED_TYPES = new Set(['High Explosive', 'Incendiary'])

/** Bônus acumulado em pontos percentuais, índice = nº de shelters adjacentes ao ALVO. */
export const SHELTER_BONUS_BY_COUNT = [0, 0.15, 0.20, 0.22] as const

/** Até qual contagem o valor tem lastro no datamine. Acima disso a UI marca como estimado. */
export const SHELTER_CONFIRMED_UP_TO = 1

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
  /**
   * Breaching Modifier — multiplica a CHANCE de brechar, NÃO o dano.
   * fonte: wiki oficial (Trench & Bunker Construction System #Breach) + datamine Update 65.
   * A chance normal vai de 0% a 25% conforme o HP cai abaixo do Breachable Health; este valor
   * multiplica essa chance (0–25% × mod). Armas que ignoram o limiar usam 25% × mod fixo.
   *
   * ATENÇÃO: o campo existe em DUAS abas do datamine, e qual vale depende da arma:
   *   - aba "Ammo" para carga colocada/lançada pelo próprio item (Hydra's 1.2, Havoc 3,
   *     Alligator 3);
   *   - aba "Mount Points" para o que é disparado de uma plataforma — aí o modificador é da
   *     PLATAFORMA, não da munição (250mm Purity 3, 250mm Fury 2, Shatter Missile 0.7).
   * Ler só a aba Ammo fazia esses três aparecerem como 1. Default 1.
   */
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
  /**
   * Ciclo de tiro base em segundos da plataforma de cerco canônica desta munição.
   * fonte: datamine Update 65, aba "Mount Points" — "Firing Duration (Delay between refire)"
   * + "Reload Duration" do mount correspondente.
   *
   * ATENÇÃO: recarga é propriedade da PLATAFORMA, não da munição — o mesmo 150mm tem ciclo
   * diferente numa emplacement e num tanque. Aqui fica a plataforma emplaçada/de campo
   * (a relevante em cerco), com preferência pela variante Colonial quando existem as duas.
   * `platform` diz de qual mount o número veio, para o usuário poder conferir e ajustar.
   * Ausente = o datamine não dá uma plataforma clara (infantaria/carga colocada) — nesses
   * casos a UI mantém o valor manual, sem inventar número.
   */
  cycleSeconds?: number
  /** Plataforma de onde veio o cycleSeconds (rótulo legível para a UI). */
  platform?: string
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
// fonte: foxholeplanner (gui.js). NÃO confirmado no datamine — ver aviso abaixo.
export const WET_CONCRETE_DRYING_MULTIPLIER = 10

// Tempo total de cura (segundos) — a partir daí o concreto está "dry" (×1).
// fonte: datamine Update 65, Structures (Bunkers) → "Concrete Settle Duration Mins" = 1080 min
// para TODAS as 20 peças T3 padrão (Bunker, Bunker Base, Corner, Ramp, Hearth, garrisons de
// Rifle/MG/AT/Artillery, Storage/Engine/Medical/Fire Suppression/Artillery Shelter, Observation,
// Large Structure Foundation e as trincheiras T3). 1080 min = 18h.
export const CONCRETE_FULL_CURE_SECONDS = 64800

// Exceção: só duas estruturas curam mais devagar — 2880 min = 48h.
// fonte: mesma coluna do datamine (FortGarrisonStation e LRArtillery).
export const CONCRETE_FULL_CURE_SECONDS_LARGE = 172800
export const LARGE_STRUCTURE_LONG_CURE = ['Underground Fortress', 'Storm Cannon'] as const

// AVISO DE PROCEDÊNCIA: o 18h acima vem do datamine, mas o ×10 e a curva de decaimento
// (CONCRETE_FULL_CURE_SECONDS / tempo, saturando no ×10) vêm do foxholeplanner, que ainda
// usa 86400s (24h) — ou seja, ele está desatualizado nessa janela. Mantivemos a FORMA da
// curva e reescalamos a janela para o valor do datamine, mas nem o ×10 nem o formato do
// decaimento estão confirmados contra a versão atual do jogo.
// TODO: confirmar empiricamente o multiplicador e a curva de cura in-game.

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
  { key: '30mm', label: '30mm', iconType: 'round', damageTypeName: 'Explosive', damage: 400, profiles: EXPLOSIVE_PROFILE, multipliers: { t2: 0.99, t3: 0.99 }, cycleSeconds: 4, platform: 'Deployed ISG' },
  { key: 'rpg', label: 'RPG', iconType: 'round', damageTypeName: 'Explosive', damage: 550, profiles: EXPLOSIVE_PROFILE, multipliers: { t3: 0.99 } },
  { key: '40mm', label: '40mm', iconType: 'round', damageTypeName: 'Explosive', damage: 600, profiles: EXPLOSIVE_PROFILE, cycleSeconds: 4, platform: 'Field Cannon' },
  { key: '75mm', label: '75mm', iconType: 'round', damageTypeName: 'Explosive', damage: 1750, profiles: EXPLOSIVE_PROFILE, cycleSeconds: 3, platform: 'Emplaced Large Cannon' },
  // ── Armour Piercing ──────────────────────────────────────────────────────────
  { key: '68mm', label: '68mm', iconType: 'ap', damageTypeName: 'Armour Piercing', damage: 600, profiles: AP_PROFILE, cycleSeconds: 4, platform: 'Field AT Gun' },
  { key: '94.5mm', label: '94.5mm', iconType: 'ap', damageTypeName: 'Armour Piercing', damage: 1750, profiles: AP_PROFILE, cycleSeconds: 4, platform: 'Large Field AT Gun' },
  // ── Artilharia (HE) ──────────────────────────────────────────────────────────
  // Mortar (Cremari) é infantaria — o datamine não dá um ciclo de mount, então fica sem preset.
  { key: 'mortar', label: 'Mortar', iconType: 'arty', damageTypeName: 'High Explosive', damage: 300, profiles: EXPLOSIVE_PROFILE },
  { key: '120mm', label: '120mm', iconType: 'arty', damageTypeName: 'High Explosive', damage: 400, profiles: EXPLOSIVE_PROFILE, cycleSeconds: 3.5, platform: 'Field Artillery' },
  { key: '150mm', label: '150mm', iconType: 'arty', damageTypeName: 'High Explosive', damage: 900, profiles: EXPLOSIVE_PROFILE, cycleSeconds: 5.5, platform: 'Emplaced Heavy Artillery' },
  // Rocket (3C-High Explosive Rocket) — BPHighExplosiveFalloffDamageType, afetado por shelter.
  { key: 'rocket', label: 'Rocket', iconType: 'rocket', damageTypeName: 'High Explosive', damage: 700, profiles: EXPLOSIVE_PROFILE, cycleSeconds: 3.9, platform: 'Emplaced Rocket Launcher' },
  // Fire Rocket (4C-Fire Rocket) — BPIncendiaryHighExplosiveDamageType. Perfil idêntico ao HE
  // (Tier1/2/3Structure mig = 0.25/0.35/0.75), afetado por shelter, NÃO brecha bunkers.
  { key: 'firerocket', label: 'Fire Rocket', iconType: 'rocket', damageTypeName: 'Incendiary', damage: 145, profiles: EXPLOSIVE_PROFILE, cycleSeconds: 5.4, platform: 'Field Rocket Launcher' },
  // Shatter Missile — BPDemolitionBreachingFalloffDamageType: ignora limiar de brecha.
  // Modificador 0.7 vem do mount (Gunboat2C / ScoutTankMultiW), não da munição: é a única
  // arma do jogo com chance de brecha REDUZIDA, compensada por poder brechar a qualquer HP.
  { key: 'shattermissile', label: 'Shatter Missile', iconType: 'rocket', damageTypeName: 'Demolition', damage: 250, profiles: DEMOLITION_PROFILE, ignoresBreachThreshold: true, breachingModifier: 0.7, cycleSeconds: 5.4, platform: 'Gunboat' },
  // Hydra's usa BPDemolitionDamageType: NÃO ignora limiar de brecha.
  { key: 'hydras', label: "Hydra's", iconType: 'rocket', damageTypeName: 'Demolition', damage: 550, profiles: DEMOLITION_PROFILE, breachingModifier: 1.2 },
  // Raidbreaker (Mark II Raidbreaker) — BPHighExplosiveRuinDamageType, afetado por shelter.
  { key: 'raidbreaker', label: 'Raidbreaker', iconType: 'arty', damageTypeName: 'High Explosive', damage: 1200, profiles: EXPLOSIVE_PROFILE },
  // ── Artilharia de cerco ───────────────────────────────────────────────────────
  // 250mm "Fury" usa BPDemolitionBreachingDamageType: ignora limiar de brecha.
  // Modificador 2 vem do mount (LargeFieldMortarC / Gunboat2W). A troca de design fica clara
  // ao lado do Purity: Fury brecha a qualquer HP mas com chance menor; Purity precisa do
  // limiar mas rola mais alto quando chega lá.
  { key: '250mm-fury', label: '250mm (Fury)', iconType: 'satchel', damageTypeName: 'Demolition', damage: 800, profiles: DEMOLITION_PROFILE, ignoresBreachThreshold: true, breachingModifier: 2, cycleSeconds: 5.5, platform: 'Large Field Mortar' },
  // 250mm "Purity" usa BPDemolitionDamageType: NÃO ignora limiar (precisa de fase 1).
  // Modificador 3 vem do mount (FieldMortarC/W, MortarTankC, MediumTankSiegeW).
  { key: '250mm-purity', label: '250mm (Purity)', iconType: 'satchel', damageTypeName: 'Demolition', damage: 800, profiles: DEMOLITION_PROFILE, breachingModifier: 3, cycleSeconds: 5.5, platform: 'Field Mortar' },
  // 300mm usa BPHighExplosiveBreachingLeakDamageType: ignora limiar E bypassa shelter.
  { key: '300mm', label: '300mm', iconType: 'arty', damageTypeName: 'High Explosive', damage: 3000, profiles: EXPLOSIVE_PROFILE, bypassesShelter: true, ignoresBreachThreshold: true, cycleSeconds: 4.5, platform: 'Storm Cannon' },
  // ── Cargas de demolição ───────────────────────────────────────────────────────
  // Alligator usa BPDemolitionDamageType: NÃO ignora limiar de brecha.
  { key: 'alligator', label: 'Alligator', iconType: 'satchel', damageTypeName: 'Demolition', damage: 550, profiles: DEMOLITION_PROFILE, breachingModifier: 3, placed: true },
  // Havoc usa BPDemolitionBreachingDamageType: ignora limiar de brecha.
  { key: 'havoc', label: 'Havoc Charge', iconType: 'satchel', damageTypeName: 'Demolition', damage: 1950, profiles: DEMOLITION_PROFILE, breachingModifier: 3, placed: true, ignoresBreachThreshold: true },
]
