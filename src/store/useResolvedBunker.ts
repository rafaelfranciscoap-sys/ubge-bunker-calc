import { useMemo } from 'react'
import { findPieceDataByName, TOOLBAR_PIECES, type PieceCost, type PieceT3Data, type ToolbarPieceOption } from '../data/pieces'
import { buildBunkerGraphFromGrid, type GridPiece } from '../engine/grid'
import {
  computeBreachableHealth,
  computeBreachableHealthPercent,
  computeCompactBonus,
  computeDotBreakdown,
  computeMaxHealth,
  computeStructuralIntegrity,
  sumDotTotals,
} from '../engine/structuralIntegrity'
import { useBunkerBuilderStore, type PlacedPiece } from './useBunkerBuilderStore'

export interface ResolvedPiece {
  placed: PlacedPiece
  toolbar: ToolbarPieceOption
  data: PieceT3Data | undefined
}

export interface BunkerStatsComputable {
  computable: true
  size: number
  cost: PieceCost
  totalDots: number
  greenDots: number
  /** Fração do Compact Bonus (0.15 × dots verdes/total) já embutida em `structuralIntegrity`. */
  compactBonus: number
  structuralIntegrity: number
  maxHealth: number
  breachableHealthPercent: number
  breachableHealth: number
}

export interface BunkerStatsNotComputable {
  computable: false
  size: number
  cost: PieceCost
}

export type BunkerStats = BunkerStatsComputable | BunkerStatsNotComputable

const EMPTY_COST: PieceCost = { concrete: 0, buildingMaterials: 0, diggingMaterials: 0 }

// Resolve o layout guardado na store do BunkerBuilder (Fase 3) em peças com seus dados de
// jogo (Fase 1/2) já anexados, o grafo pronto para o engine, e as estatísticas agregadas da
// ilha inteira. Compartilhado entre BunkerBuilder e SiegeCalculator para não duplicar a
// lógica de resolução peça-a-peça.
export function useResolvedBunker() {
  const tier = useBunkerBuilderStore((state) => state.tier)
  const placedPieces = useBunkerBuilderStore((state) => state.placedPieces)

  const resolvedPieces: ResolvedPiece[] = useMemo(
    () =>
      placedPieces.map((placed) => {
        const toolbar = TOOLBAR_PIECES.find((option) => option.key === placed.toolbarKey)!
        const data = findPieceDataByName(toolbar.dataName)
        return { placed, toolbar, data }
      }),
    [placedPieces],
  )

  const gridPieces: GridPiece[] = useMemo(
    () =>
      resolvedPieces.map(({ placed, toolbar, data }) => ({
        id: placed.id,
        col: placed.col,
        row: placed.row,
        shape: toolbar.shape,
        rotation: placed.rotation,
        edgeModifier: tier === 'T3' ? data?.confirmedEdgeModifier ?? null : null,
      })),
    [resolvedPieces, tier],
  )

  const stats: BunkerStats = useMemo(() => {
    const size = resolvedPieces.length
    const cost = resolvedPieces.reduce((acc, { data }) => {
      if (!data) return acc
      return {
        concrete: acc.concrete + data.cost.concrete,
        buildingMaterials: acc.buildingMaterials + data.cost.buildingMaterials,
        diggingMaterials: acc.diggingMaterials + data.cost.diggingMaterials,
      }
    }, EMPTY_COST)

    if (tier !== 'T3' || size === 0) {
      return { size, cost, computable: false }
    }

    const graph = buildBunkerGraphFromGrid(gridPieces)
    const dotBreakdown = computeDotBreakdown(graph)
    const { totalDots, greenDots } = sumDotTotals(dotBreakdown)
    const compactBonus = computeCompactBonus(greenDots, totalDots)
    const structuralIntegrity = computeStructuralIntegrity(
      graph.pieces.map((piece) => piece.edgeModifier),
      compactBonus,
    )
    const rawHpValues = resolvedPieces.map(({ data }) => data?.rawHp ?? 0)
    const maxHealth = computeMaxHealth(rawHpValues, structuralIntegrity)
    const breachableHealthPercent = computeBreachableHealthPercent(structuralIntegrity)
    const breachableHealth = computeBreachableHealth(maxHealth, breachableHealthPercent)

    return {
      size,
      cost,
      computable: true,
      totalDots,
      greenDots,
      compactBonus,
      structuralIntegrity,
      maxHealth,
      breachableHealthPercent,
      breachableHealth,
    }
  }, [gridPieces, resolvedPieces, tier])

  return { tier, placedPieces, resolvedPieces, gridPieces, stats }
}
