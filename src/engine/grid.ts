import type { BunkerConnection, BunkerGraph } from './structuralIntegrity'

// Simplificação de grid ortogonal (linhas/colunas), usada só para demonstrar a
// mecânica de dots verde/vermelho da Fase 2. Não é fiel à grade real de
// vértices/diamante do jogo — ver TODO de formato em src/data/pieces.ts.
//
// Peça "square" (quadrado): 4 arestas ortogonais (N/E/S/W).
// Peça "triangle" (canto): ocupa a célula inteira mas só tem 2 arestas retas
// ortogonais (definidas pela rotação, um dos 4 cantos do quadrado é "cortado")
// + 1 aresta diagonal (hipotenusa) que aqui é sempre tratada como exposta/vermelha
// — não simulamos duas peças triangulares encaixando diagonalmente entre si.

export type Direction = 'N' | 'E' | 'S' | 'W'
export type Rotation = 0 | 90 | 180 | 270
export type PieceShape = 'square' | 'triangle'

export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  N: 'S',
  S: 'N',
  E: 'W',
  W: 'E',
}

export const DIRECTION_DELTA: Record<Direction, { dCol: number; dRow: number }> = {
  N: { dCol: 0, dRow: -1 },
  S: { dCol: 0, dRow: 1 },
  E: { dCol: 1, dRow: 0 },
  W: { dCol: -1, dRow: 0 },
}

const SQUARE_DIRECTIONS: Direction[] = ['N', 'E', 'S', 'W']

const TRIANGLE_STRAIGHT_DIRECTIONS_BY_ROTATION: Record<Rotation, [Direction, Direction]> = {
  0: ['N', 'W'],
  90: ['N', 'E'],
  180: ['S', 'E'],
  270: ['S', 'W'],
}

export function getOrthogonalEdgeDirections(shape: PieceShape, rotation: Rotation): Direction[] {
  return shape === 'square' ? SQUARE_DIRECTIONS : TRIANGLE_STRAIGHT_DIRECTIONS_BY_ROTATION[rotation]
}

export function getTotalDots(shape: PieceShape): number {
  return shape === 'square' ? 4 : 3
}

export interface GridPiece {
  id: string
  col: number
  row: number
  shape: PieceShape
  rotation: Rotation
  /** Modificador de aresta confirmado. `null` = ainda não confirmado (tratado como neutro/1). */
  edgeModifier: number | null
}

function cellKey(col: number, row: number): string {
  return `${col},${row}`
}

function indexByCell(pieces: GridPiece[]): Map<string, GridPiece> {
  const byCell = new Map<string, GridPiece>()
  for (const piece of pieces) byCell.set(cellKey(piece.col, piece.row), piece)
  return byCell
}

export interface EdgeDotVisual {
  pieceId: string
  kind: 'orthogonal' | 'diagonal'
  direction?: Direction
  color: 'green' | 'red'
}

// Dots para renderização visual — inclui o dot diagonal fixo (sempre vermelho) das
// peças triangulares, que não entra na lógica de conexão/grafo (buildConnectionsFromGrid).
export function computeEdgeDots(pieces: GridPiece[]): EdgeDotVisual[] {
  const byCell = indexByCell(pieces)
  const dots: EdgeDotVisual[] = []

  for (const piece of pieces) {
    for (const direction of getOrthogonalEdgeDirections(piece.shape, piece.rotation)) {
      const delta = DIRECTION_DELTA[direction]
      const neighbor = byCell.get(cellKey(piece.col + delta.dCol, piece.row + delta.dRow))
      const connected =
        neighbor !== undefined &&
        getOrthogonalEdgeDirections(neighbor.shape, neighbor.rotation).includes(
          OPPOSITE_DIRECTION[direction],
        )
      dots.push({
        pieceId: piece.id,
        kind: 'orthogonal',
        direction,
        color: connected ? 'green' : 'red',
      })
    }
    if (piece.shape === 'triangle') {
      dots.push({ pieceId: piece.id, kind: 'diagonal', color: 'red' })
    }
  }

  return dots
}

export function buildConnectionsFromGrid(pieces: GridPiece[]): BunkerConnection[] {
  const byCell = indexByCell(pieces)
  const seenPairs = new Set<string>()
  const connections: BunkerConnection[] = []

  for (const piece of pieces) {
    for (const direction of getOrthogonalEdgeDirections(piece.shape, piece.rotation)) {
      const delta = DIRECTION_DELTA[direction]
      const neighbor = byCell.get(cellKey(piece.col + delta.dCol, piece.row + delta.dRow))
      if (!neighbor) continue
      if (
        !getOrthogonalEdgeDirections(neighbor.shape, neighbor.rotation).includes(
          OPPOSITE_DIRECTION[direction],
        )
      ) {
        continue
      }
      const pairKey = [piece.id, neighbor.id].sort().join('|')
      if (seenPairs.has(pairKey)) continue
      seenPairs.add(pairKey)
      connections.push({ pieceIdA: piece.id, pieceIdB: neighbor.id })
    }
  }

  return connections
}

// Ponte entre o grid de posicionamento (UI) e o engine da Fase 2 (structuralIntegrity.ts).
export function buildBunkerGraphFromGrid(pieces: GridPiece[]): BunkerGraph {
  return {
    pieces: pieces.map((piece) => ({
      id: piece.id,
      edgeModifier: piece.edgeModifier ?? 1,
      totalDots: getTotalDots(piece.shape),
    })),
    connections: buildConnectionsFromGrid(pieces),
  }
}
