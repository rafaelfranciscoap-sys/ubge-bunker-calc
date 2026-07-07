// DADOS CONFIRMADOS — extraídos direto do código-fonte aberto do foxbunker.com/bunker/
// (js/utils.js → `const STRUCTURES`, e a fórmula de integridade em js/bunker.js), inspecionado
// em 2026-07-06 a pedido do usuário para "confirmar os valores necessários para finalização".
//
// O usuário (UBGE) trata o foxbunker como fonte de verdade empírica. Portanto estes números
// satisfazem a "regra de ouro" do projeto (nada estimado): são os valores que o próprio
// foxbunker usa, não leituras aproximadas.
//
// ATENÇÃO — o que o foxbunker NÃO tem (confirmado por busca no fonte): resistência a explosivo,
// distinção wet/dry de concreto, manutenção (MSupps/hora) e dano de armas. Esses campos
// permanecem legitimamente bloqueados no projeto — precisam de teste in-game, não do foxbunker.

export type FoxbunkerTierRow = {
  /** Modificador de aresta REAL por peça (single-piece). Entra no PRODUTO da integridade. */
  edgeModifier: number
  rawHp: number
  repairBmat: number
  digCost: number
  bmatCost: number
  concCost: number
}

export interface FoxbunkerStructure {
  name: string
  /** Código de forma do foxbunker: 1 = peça padrão de 1 célula; 2 = sala interna; 3 = estrutura grande/especial. */
  shapeCode: 1 | 2 | 3
  /** [T1, T2, T3]. `null` = não construível nesse tier. */
  tiers: [FoxbunkerTierRow | null, FoxbunkerTierRow | null, FoxbunkerTierRow | null]
}

function row(values: [number, number, number, number, number, number] | null): FoxbunkerTierRow | null {
  if (!values) return null
  const [edgeModifier, rawHp, repairBmat, digCost, bmatCost, concCost] = values
  return { edgeModifier, rawHp, repairBmat, digCost, bmatCost, concCost }
}

// Ordem e valores EXATAMENTE como no STRUCTURES do foxbunker (utils.js).
export const FOXBUNKER_STRUCTURES: FoxbunkerStructure[] = [
  { name: 'Blank', shapeCode: 1, tiers: [row([0.97, 750, 50, 75, 0, 0]), row([0.97, 2000, 75, 75, 75, 0]), row([0.97, 3750, 120, 75, 75, 15])] },
  { name: 'Corner', shapeCode: 1, tiers: [row([0.97, 750, 50, 75, 0, 0]), row([0.97, 2000, 75, 75, 75, 0]), row([0.97, 3750, 120, 75, 75, 15])] },
  { name: 'Base', shapeCode: 1, tiers: [row([0.7, 1500, 100, 75, 300, 0]), row([0.7, 2500, 150, 75, 400, 0]), row([0.7, 3500, 200, 75, 400, 25])] },
  { name: 'Rifle Garrison', shapeCode: 1, tiers: [row([0.86, 750, 50, 75, 50, 0]), row([0.86, 2000, 75, 75, 125, 0]), row([0.86, 3750, 120, 75, 125, 15])] },
  { name: 'Machine Gun Garrison', shapeCode: 1, tiers: [row([0.89, 900, 50, 75, 75, 0]), row([0.89, 2250, 75, 75, 175, 0]), row([0.89, 4050, 120, 75, 175, 15])] },
  { name: 'Anti-Tank Garrison', shapeCode: 1, tiers: [row([0.82, 650, 50, 75, 125, 0]), row([0.82, 1600, 75, 75, 275, 0]), row([0.82, 3450, 120, 75, 275, 20])] },
  { name: 'Howitzer Garrison', shapeCode: 1, tiers: [row([0.78, 650, 50, 75, 120, 0]), row([0.78, 1600, 75, 75, 275, 0]), row([0.78, 3450, 120, 75, 275, 20])] },
  { name: 'Observation Bunker', shapeCode: 1, tiers: [row([0.9, 750, 50, 75, 75, 0]), row([0.9, 1600, 75, 75, 200, 0]), row([0.9, 3450, 120, 75, 200, 10])] },
  { name: 'Engine Room', shapeCode: 2, tiers: [null, row([0.97, 2000, 75, 75, 175, 0]), row([0.97, 3750, 120, 75, 175, 15])] },
  { name: 'Fire Station', shapeCode: 2, tiers: [null, row([0.97, 2000, 75, 75, 150, 0]), row([0.97, 3750, 120, 75, 150, 15])] },
  { name: 'Ammo Room', shapeCode: 2, tiers: [null, row([0.97, 2000, 75, 75, 110, 0]), row([0.97, 3750, 120, 75, 110, 10])] },
  { name: 'Artillery Shelter', shapeCode: 1, tiers: [row([0.82, 750, 50, 75, 75, 0]), row([0.82, 2000, 75, 75, 225, 0]), row([0.82, 3750, 120, 75, 225, 25])] },
  { name: 'Med Bunker', shapeCode: 1, tiers: [row([0.97, 750, 50, 75, 75, 0]), row([0.97, 2000, 75, 75, 150, 0]), row([0.97, 3750, 120, 75, 150, 10])] },
  { name: 'Hearth', shapeCode: 1, tiers: [row([0.97, 750, 50, 75, 35, 0]), row([0.97, 2000, 75, 75, 75, 0]), row([0.97, 3750, 120, 75, 75, 15])] },
  { name: 'Ramp', shapeCode: 1, tiers: [row([0.97, 750, 50, 75, 50, 0]), row([0.97, 2000, 75, 75, 100, 0]), row([0.97, 3750, 120, 75, 100, 10])] },
  { name: 'Foundation', shapeCode: 3, tiers: [null, null, row([1, 2550, 750, 75, 75, 140])] },
  { name: 'Storm Cannon', shapeCode: 3, tiers: [null, null, row([0.65, 2550, 1200, 75, 75, 140])] },
  { name: 'Intelligence Center', shapeCode: 3, tiers: [null, null, row([0.65, 2550, 1200, 75, 75, 140])] },
  { name: 'Weather Station', shapeCode: 3, tiers: [null, null, row([0.65, 2550, 1200, 75, 75, 140])] },
  { name: 'Underground Fortress', shapeCode: 3, tiers: [null, null, row([0.99, 10000, 200, 75, 75, 140])] },
  { name: 'Radar', shapeCode: 3, tiers: [null, null, row([0.65, 2550, 1200, 75, 75, 140])] },
]

export function findFoxbunkerStructure(name: string): FoxbunkerStructure | undefined {
  return FOXBUNKER_STRUCTURES.find((structure) => structure.name === name)
}

// Fórmula de integridade do foxbunker (js/bunker.js), CONFIRMADA como a de referência.
// Difere do que o projeto implementa hoje em src/engine/structuralIntegrity.ts em dois pontos:
//
// 1) COMPACT BONUS É ADITIVO E LIMITADO, não multiplicativo.
//      integ_produto = 100 × Π(edgeModifier)            // em pontos percentuais
//      eff_bonus     = clamp(15 × verdes/total, 0, min(100 − integ_produto, integ_produto))
//      integ_final   = min(100, integ_produto + eff_bonus)
//    Prova (print do usuário): "56.6%+7.1% integ" → 63.7% final (56.6 + 7.1). O projeto faz
//    produto × (1 + bonus), que daria ~60.6% — não bate.
//
// 2) PEÇA ÚNICA (size 1) tem integridade forçada a 100% (o modificador só age a partir de 2 peças).
//
// hp = round(Σ rawHp × integ_final/100); "breach after Xhp" mostra o LIMIAR X = hp × integ_final/100;
// a quantidade breachable = hp − X = hp × (1 − integ_final/100); breach% = 100 − integ_final.
export function computeFoxbunkerIntegrity(
  edgeModifiers: number[],
  greenDots: number,
  totalDots: number,
): { integProductPercent: number; effBonusPercent: number; integFinalPercent: number } {
  if (edgeModifiers.length <= 1) {
    return { integProductPercent: 100, effBonusPercent: 0, integFinalPercent: 100 }
  }
  const integProductPercent = 100 * edgeModifiers.reduce((acc, m) => acc * m, 1)
  const rawBonus = totalDots > 0 ? (15 * greenDots) / totalDots : 0
  const effBonusPercent = Math.max(
    0,
    Math.min(rawBonus, 100 - integProductPercent, integProductPercent),
  )
  const integFinalPercent = Math.min(100, integProductPercent + effBonusPercent)
  return { integProductPercent, effBonusPercent, integFinalPercent }
}
