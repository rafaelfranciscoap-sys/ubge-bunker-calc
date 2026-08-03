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
// contra três casos independentes (ver bunkerHealth.test.ts) e contra os valores de
// Structural Integrity / Max Health do datamine Update 65. Os limites do bônus vêm do
// fonte do próprio foxbunker (data/foxbunkerReference.ts), corroborados pela planilha
// BunkerTheory da comunidade colonial.

import { computeFoxbunkerIntegrity } from '../data/foxbunkerReference'

/** Teto bruto do bônus de compactação, antes dos limites abaixo. */
export const COMPACT_BONUS_MAX = 0.15

/** Produto das integridades — o termo que decai exponencialmente com o nº de peças. */
export function integrityProduct(integrities: number[]): number {
  return integrities.reduce((acc, si) => acc * si, 1)
}

/**
 * Bônus de compactação BRUTO: fração de conexões feitas × teto. Ainda sem os limites.
 *
 * O denominador (o "24" de "12/24" no card do foxbunker) é **lados expostos + conexões**.
 * Num 3×3: 9 peças × 4 = 36 lados, as 12 conexões consomem 24, sobram 12 expostos →
 * 12 + 12 = 24. Derivação conferida de 2×2 a 10×10 contra a planilha BunkerTheory da
 * comunidade colonial.
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
  if (pieceHps.length === 0) {
    return { rawHp: 0, integrity: 0, bonus: 0, totalMultiplier: 0, finalHp: 0 }
  }

  // Delega para a fórmula extraída do fonte do foxbunker (data/foxbunkerReference.ts) em vez de
  // repetir a conta aqui: é ele quem calcula o HP que a aba Importar consome, então as duas
  // telas do app têm de concordar por construção, não por coincidência.
  //
  // Ela traz três regras que a soma ingênua "produto + bônus" não tem:
  //   1. bônus ≤ produto        — o bônus nunca mais que dobra a integridade. Só morde acima de
  //      ~70 peças, e aí muda muito: num 10×10 T3 dá 35.664 em vez dos 63.855 da soma ingênua.
  //   2. bônus ≤ 100 − produto  — o total nunca passa de 100%.
  //   3. peça única = 100%      — o modificador só age a partir de 2 peças.
  // A regra 1 aparece também na planilha BunkerTheory da comunidade colonial, por outro caminho
  // (lá escrita como "se bônus > integridade, HP = bruto × integridade × 2"), e a 3 idem.
  const rawBonusPercent = compactBonus(connections, maxConnections) * 100
  const ratio = COMPACT_BONUS_MAX > 0 ? rawBonusPercent / (COMPACT_BONUS_MAX * 100) : 0
  const { integProductPercent, effBonusPercent, integFinalPercent } = computeFoxbunkerIntegrity(
    integrities,
    ratio,
    1,
  )

  return {
    rawHp,
    integrity: integProductPercent / 100,
    bonus: effBonusPercent / 100,
    totalMultiplier: integFinalPercent / 100,
    finalHp: Math.round((rawHp * integFinalPercent) / 100),
  }
}
