import type { ImportedBunkerStats } from '../store/useImportedBunkerStore'

// Import direto do texto copiado pelo botão "Copy" do foxbunker.com/bunker/.
//
// fonte: código-fonte aberto do foxbunker (js/bunker.js, campo `bunker.stats_text`), inspecionado
// diretamente. O "Copy" copia estas linhas cercadas por ``` :
//   🛠️ 18,940hp (63.7% integ, size 8)
//   💥 36.3% breach (after 12,058hp)
//   📊 56.6%+7.1% integ (9/19)
//   🔨 1,040 repair (18.2hp per bmat)
//   🏗️ 130 conc 925 bmat 600 dig
//
// Vantagem sobre a extração por imagem (IA): não precisa de chave de API, é 100% offline e
// determinística. Os números são os que o próprio foxbunker já calculou — nossa "regra de ouro"
// (nada estimado) é respeitada porque a fonte é o valor confirmado, não uma leitura aproximada.

function parseGroupedNumber(raw: string): number {
  // foxbunker formata com toLocaleString("en-US") → separador de milhar é vírgula.
  return Number(raw.replace(/,/g, ''))
}

export interface FoxbunkerParseResult {
  stats: ImportedBunkerStats
  /** Valor "breach after Xhp" do foxbunker (limiar de HP), guardado para conferência/UI. */
  breachThresholdHp: number | null
  /** greens/total de dots (compact bonus), só informativo. */
  greenDots: number | null
  totalDots: number | null
}

// Retorna null se o texto não contém sequer a linha principal (hp + integ + size) — aí não é
// um card do foxbunker e não inventamos nada.
export function parseFoxbunkerStats(rawText: string): FoxbunkerParseResult | null {
  const text = rawText.replace(/```/g, ' ')

  const main = /([\d,]+)\s*hp\s*\(\s*([\d.]+)\s*%\s*integ\s*,\s*size\s*(\d+)\s*\)/i.exec(text)
  if (!main) return null

  const hpTotal = parseGroupedNumber(main[1])
  const integrityPercent = Number(main[2])
  const size = Number(main[3])

  const breach = /([\d.]+)\s*%\s*breach\s*\(\s*after\s*([\d,]+)\s*hp\s*\)/i.exec(text)
  const breachPercent = breach ? Number(breach[1]) : null
  const breachThresholdHp = breach ? parseGroupedNumber(breach[2]) : null
  // Semântica do projeto: breachHpAbsolute = quanto de HP precisa ser removido ANTES do breach
  // = HP total − limiar. O foxbunker mostra o limiar ("after Xhp"), não a quantidade.
  const breachHpAbsolute =
    breachThresholdHp !== null
      ? hpTotal - breachThresholdHp
      : breachPercent !== null
        ? Math.round(hpTotal * (breachPercent / 100))
        : null

  const dots = /([\d.]+)\s*%\s*\+\s*([\d.]+)\s*%\s*integ\s*\(\s*([\d,]+)\s*\/\s*([\d,]+)\s*\)/i.exec(text)
  const greenDots = dots ? parseGroupedNumber(dots[3]) : null
  const totalDots = dots ? parseGroupedNumber(dots[4]) : null

  const repair = /([\d,]+)\s*repair\s*\(\s*([\d.]+)\s*hp\s*per\s*bmat\s*\)/i.exec(text)
  const repairBmat = repair ? parseGroupedNumber(repair[1]) : null

  // Linha de custo de construção: "130 conc 925 bmat 600 dig".
  const cost = /([\d,]+)\s*conc\s+([\d,]+)\s*bmat\s+([\d,]+)\s*dig/i.exec(text)
  const constructionConcrete = cost ? parseGroupedNumber(cost[1]) : null
  const constructionBmat = cost ? parseGroupedNumber(cost[2]) : null
  const constructionDigging = cost ? parseGroupedNumber(cost[3]) : null

  return {
    stats: {
      hpTotal,
      breachPercent,
      breachHpAbsolute,
      integrityPercent,
      size,
      // foxbunker: "repair" é sempre em bmat; repairCost e repairBmat coincidem.
      repairCost: repairBmat,
      repairBmat,
      constructionConcrete,
      constructionBmat,
      constructionDigging,
    },
    breachThresholdHp,
    greenDots,
    totalDots,
  }
}
