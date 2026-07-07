// Decaimento e manutenção — DADOS CONFIRMADOS do datamine Update 65, aba "Structures (Bunkers)"
// (colunas Decay Start Hours + Decay Duration Hours + Repair Cost).
//
// Mecânica: depois de construída/mantida, uma peça fica intacta por `startHours`; então começa a
// decair e leva `durationHours` até ser destruída (se ninguém reparar/manter). Manter = reparar
// (martelo) antes disso, o que zera o cronômetro. Tempo total até destruir sem manutenção =
// startHours + durationHours.
//
// NOTA: o datamine NÃO traz o consumo de Maintenance Supplies (msupps) de um Túnel de Manutenção —
// esse número (ex.: o "x6" do foxholeplanner) não está na fonte, então NÃO o estimamos. O modelo
// de manutenção aqui é o de decaimento/reparo, que é o que a fonte confirma.
//
// Valores da peça-padrão (garrison/bunker) por tier; variam levemente por tipo de peça (ex.: Bunker
// Base e Underground Fortress decaem bem mais devagar). T3 é o caso principal e é bem consistente
// (~75h para começar, ~45h de janela).

export type StructureTier = 'T1' | 'T2' | 'T3'

export interface DecayWindow {
  /** Horas intactas após a última manutenção antes de começar a decair. */
  startHours: number
  /** Horas de decaimento até a destruição, se não for mantida. */
  durationHours: number
}

export const DECAY_BY_TIER: Record<StructureTier, DecayWindow> = {
  T1: { startHours: 30, durationHours: 31 },
  T2: { startHours: 29, durationHours: 31 },
  T3: { startHours: 75, durationHours: 45 },
}

export function totalDecayHours(tier: StructureTier): number {
  const w = DECAY_BY_TIER[tier]
  return w.startHours + w.durationHours
}

// Infere o tier a partir dos números importados (o foxbunker não rotula o tier de forma direta).
// Usa o Raw HP médio por peça: HP_max = Σ rawHp × integridade → rawHp/peça ≈ HP_max/(size × integ).
// Peça T1 ≈ 750, T2 ≈ 2000, T3 ≈ 3750 de Raw HP.
export function inferTierFromImport(
  hpTotal: number | null,
  size: number | null,
  integrityPercent: number | null,
): StructureTier | null {
  if (!hpTotal || !size || !integrityPercent) return null
  const rawPerPiece = hpTotal / (size * (integrityPercent / 100))
  if (rawPerPiece > 2800) return 'T3'
  if (rawPerPiece > 1300) return 'T2'
  return 'T1'
}
