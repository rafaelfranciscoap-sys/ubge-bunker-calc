// Vida total de um bunker (a "ilha") a partir das peças que o compõem.
//
//   HP_final = HP_bruto × ( ∏(integridade de cada peça)  +  bônus_de_compactação )
//
// Duas forças opostas, e é isso que dá a forma do jogo:
//   - a integridade é MULTIPLICATIVA: cada peça multiplica o total por ~0.97, então crescer
//     castiga exponencialmente (9 peças = 76%, 20 = 54%, 40 = 30%);
//   - a compactação é ADITIVA e limitada: devolve no máximo +15pp, de forma linear.
//   Resultado: bunker espalhado é frágil, bloco fechado é forte, e o prêmio tem teto.
//
// fonte da fórmula: apresentação de mecânicas compartilhada pelo usuário, verificada aqui
// contra dois casos independentes (ver bunkerHealth.test.ts) e contra os valores de
// Structural Integrity / Max Health do datamine Update 65.

/** Teto do bônus de compactação, em fração. Atingido com todas as conexões possíveis. */
export const COMPACT_BONUS_MAX = 0.15

/** Produto das integridades — o termo que decai exponencialmente com o nº de peças. */
export function integrityProduct(integrities: number[]): number {
  return integrities.reduce((acc, si) => acc * si, 1)
}

/**
 * Bônus de compactação: fração de conexões feitas × teto.
 * ATENÇÃO: o denominador (o "24" de "12/24" no card do foxbunker) é o total de conexões que
 * o foxbunker conta para o layout; não derivamos essa contagem aqui — ela vem do card.
 */
export function compactBonus(connections: number, maxConnections: number): number {
  if (maxConnections <= 0) return 0
  const ratio = Math.min(Math.max(connections / maxConnections, 0), 1)
  return ratio * COMPACT_BONUS_MAX
}

export interface BunkerHealthBreakdown {
  rawHp: number
  integrity: number
  bonus: number
  /** integridade + bônus — é o "% integ" que o foxbunker mostra na primeira linha. */
  totalMultiplier: number
  finalHp: number
}

export function bunkerHealth(
  pieceHps: number[],
  integrities: number[],
  connections: number,
  maxConnections: number,
): BunkerHealthBreakdown {
  const rawHp = pieceHps.reduce((acc, hp) => acc + hp, 0)
  const integrity = pieceHps.length > 0 ? integrityProduct(integrities) : 0
  const bonus = pieceHps.length > 0 ? compactBonus(connections, maxConnections) : 0
  const totalMultiplier = integrity + bonus
  return {
    rawHp,
    integrity,
    bonus,
    totalMultiplier,
    finalHp: Math.round(rawHp * totalMultiplier),
  }
}
