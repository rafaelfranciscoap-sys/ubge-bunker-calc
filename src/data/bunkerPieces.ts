// Catálogo de peças de bunker para o explicador de vida (aba "How it works").
//
// fonte: datamine Update 65, aba "Structures (Bunkers)" — colunas "Max Health" e
// "Structural Integrity", lidas peça a peça. Nada estimado.
//
// NÃO confundir com src/data/pieces.ts: aquele é do caminho legado do Construtor e carrega
// a distinção histórica isolatedModifierHint × confirmedEdgeModifier. O CLAUDE.md já
// registrava a suspeita de que os confirmedEdgeModifier (0.941, 0.740, 0.672) eram o
// QUADRADO do modificador real (0.97², 0.86², 0.82²), resultado de teste em par gravado como
// se fosse de uma peça só. O datamine confirma: a integridade real por peça é 0.97 / 0.86 /
// 0.82 — exatamente os valores que lá estavam como "hint". Este módulo usa os do datamine.

export type BunkerTierKey = 't1' | 't2' | 't3'

export interface BunkerPiece {
  key: string
  label: string
  /** Structural Integrity da peça (datamine). Multiplica no produto de integridade. */
  integrity: number
  /** Max Health por tier (datamine). */
  hp: Record<BunkerTierKey, number>
  /** Marca a peça que dá o shelter bonus, para o explicador destacar a troca. */
  isShelter?: boolean
}

export const BUNKER_PIECES: BunkerPiece[] = [
  {
    key: 'bunker',
    label: 'Bunker / Corner / Ramp',
    integrity: 0.97,
    hp: { t1: 750, t2: 2000, t3: 3750 },
  },
  {
    key: 'room',
    label: 'Storage / Engine / Medical Room',
    integrity: 0.97,
    hp: { t1: 750, t2: 2000, t3: 3750 },
  },
  {
    key: 'observation',
    label: 'Observation Bunker',
    integrity: 0.9,
    hp: { t1: 750, t2: 1600, t3: 3450 },
  },
  {
    key: 'mg',
    label: 'Machine Gun Garrison',
    integrity: 0.89,
    hp: { t1: 900, t2: 2250, t3: 4050 },
  },
  {
    key: 'rifle',
    label: 'Rifle Garrison',
    integrity: 0.86,
    hp: { t1: 750, t2: 2000, t3: 3750 },
  },
  {
    key: 'shelter',
    label: 'Artillery Shelter Room',
    integrity: 0.82,
    hp: { t1: 750, t2: 2000, t3: 3750 },
    isShelter: true,
  },
  {
    key: 'atgun',
    label: 'AT Gun Garrison',
    integrity: 0.82,
    hp: { t1: 650, t2: 1600, t3: 3450 },
  },
  {
    key: 'artillery',
    label: 'Artillery Garrison',
    integrity: 0.78,
    hp: { t1: 650, t2: 1600, t3: 3450 },
  },
  {
    key: 'base',
    label: 'Bunker Base',
    integrity: 0.7,
    hp: { t1: 1500, t2: 2500, t3: 3500 },
  },
]

export const TIER_LABEL: Record<BunkerTierKey, string> = {
  t1: 'T1',
  t2: 'T2',
  t3: 'T3',
}
