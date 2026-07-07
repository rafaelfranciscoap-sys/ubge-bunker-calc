// Modelo B (edge/dot integrity) — ver src/data/pieces.ts (PIECES_EDGE_DOT_INTEGRITY) e CLAUDE.md.
// fonte: Johnny Guitar v6 (confere com prints do foxbunker.com)

export interface BunkerPieceNode {
  id: string
  edgeModifier: number
  totalDots: number // 3 (triângulo) ou 4 (quadrado)
}

export interface BunkerConnection {
  pieceIdA: string
  pieceIdB: string
}

export interface BunkerGraph {
  pieces: BunkerPieceNode[]
  connections: BunkerConnection[]
}

export interface PieceDotBreakdown {
  pieceId: string
  totalDots: number
  greenDots: number
  redDots: number
}

// Passos 1-3: um dot é verde se está numa aresta conectada a outra peça do bunker,
// vermelho se está na borda externa (exposto).
export function computeDotBreakdown(graph: BunkerGraph): PieceDotBreakdown[] {
  const greenCountByPiece = new Map<string, number>()
  for (const piece of graph.pieces) {
    greenCountByPiece.set(piece.id, 0)
  }

  for (const connection of graph.connections) {
    greenCountByPiece.set(
      connection.pieceIdA,
      (greenCountByPiece.get(connection.pieceIdA) ?? 0) + 1,
    )
    greenCountByPiece.set(
      connection.pieceIdB,
      (greenCountByPiece.get(connection.pieceIdB) ?? 0) + 1,
    )
  }

  return graph.pieces.map((piece) => {
    const greenDots = Math.min(greenCountByPiece.get(piece.id) ?? 0, piece.totalDots)
    return {
      pieceId: piece.id,
      totalDots: piece.totalDots,
      greenDots,
      redDots: piece.totalDots - greenDots,
    }
  })
}

export interface DotTotals {
  totalDots: number
  greenDots: number
}

export function sumDotTotals(breakdown: PieceDotBreakdown[]): DotTotals {
  return breakdown.reduce(
    (acc, piece) => ({
      totalDots: acc.totalDots + piece.totalDots,
      greenDots: acc.greenDots + piece.greenDots,
    }),
    { totalDots: 0, greenDots: 0 },
  )
}

// Compact Bonus = 0.15 × (total de dots verdes / total de dots)
export function computeCompactBonus(greenDots: number, totalDots: number): number {
  if (totalDots === 0) return 0
  return 0.15 * (greenDots / totalDots)
}

// Structural Integrity = produto dos modificadores de aresta de todas as peças × (1 + Compact Bonus)
export function computeStructuralIntegrity(edgeModifiers: number[], compactBonus: number): number {
  const product = edgeModifiers.reduce((acc, modifier) => acc * modifier, 1)
  return product * (1 + compactBonus)
}

// Max Health = soma do Raw HP de todas as peças × Structural Integrity
export function computeMaxHealth(rawHpValues: number[], structuralIntegrity: number): number {
  const totalRawHp = rawHpValues.reduce((acc, hp) => acc + hp, 0)
  return totalRawHp * structuralIntegrity
}

// Breachable Health % = 100 × (1 - Structural Integrity)
export function computeBreachableHealthPercent(structuralIntegrity: number): number {
  return 100 * (1 - structuralIntegrity)
}

// Breachable Health (valor absoluto) = Max Health × Breachable Health%
export function computeBreachableHealth(maxHealth: number, breachableHealthPercent: number): number {
  return maxHealth * (breachableHealthPercent / 100)
}
