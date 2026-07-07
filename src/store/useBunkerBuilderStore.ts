import { create } from 'zustand'
import { TOOLBAR_PIECES } from '../data/pieces'
import type { Rotation } from '../engine/grid'

export type BuilderTier = 'T2' | 'T3'

/** 'build' = comportamento original de posicionar/girar/trocar; 'select' = clique
 * alterna a peça na seleção do painel Selection Stats. */
export type InteractionMode = 'build' | 'select'

export interface PlacedPiece {
  id: string
  toolbarKey: string
  col: number
  row: number
  rotation: Rotation
}

interface BunkerBuilderState {
  tier: BuilderTier
  selectedToolbarKey: string
  placedPieces: PlacedPiece[]
  interactionMode: InteractionMode
  /** Ids de peças na seleção do Selection Stats (subconjunto de placedPieces). */
  selectedPieceIds: string[]
  setTier: (tier: BuilderTier) => void
  selectToolbarKey: (key: string) => void
  setInteractionMode: (mode: InteractionMode) => void
  togglePieceSelected: (pieceId: string) => void
  selectAllPieces: () => void
  clearSelection: () => void
  /** Clique em célula vazia: posiciona a peça selecionada. Clique na mesma peça: gira 90°.
   * Clique em peça de outro tipo: substitui pela peça selecionada. */
  placeOrCycleAt: (col: number, row: number) => void
  removePieceAt: (col: number, row: number) => void
  clearAll: () => void
  /** Substitui tier + layout inteiros — usado ao carregar um design salvo (Fase 6). */
  loadLayout: (tier: BuilderTier, pieces: PlacedPiece[]) => void
}

export const useBunkerBuilderStore = create<BunkerBuilderState>((set, get) => ({
  tier: 'T3',
  selectedToolbarKey: TOOLBAR_PIECES[0].key,
  placedPieces: [],
  interactionMode: 'build',
  selectedPieceIds: [],

  setTier: (tier) => set({ tier }),

  selectToolbarKey: (key) => set({ selectedToolbarKey: key }),

  setInteractionMode: (mode) => set({ interactionMode: mode }),

  togglePieceSelected: (pieceId) => {
    const { selectedPieceIds } = get()
    set({
      selectedPieceIds: selectedPieceIds.includes(pieceId)
        ? selectedPieceIds.filter((id) => id !== pieceId)
        : [...selectedPieceIds, pieceId],
    })
  },

  selectAllPieces: () => set({ selectedPieceIds: get().placedPieces.map((piece) => piece.id) }),

  clearSelection: () => set({ selectedPieceIds: [] }),

  placeOrCycleAt: (col, row) => {
    const { placedPieces, selectedToolbarKey } = get()
    const existing = placedPieces.find((piece) => piece.col === col && piece.row === row)

    if (!existing) {
      // crypto.randomUUID (não um contador incremental) para nunca colidir com ids de
      // peças vindas de um design salvo/carregado do localStorage (Fase 6).
      const newPiece: PlacedPiece = {
        id: crypto.randomUUID(),
        toolbarKey: selectedToolbarKey,
        col,
        row,
        rotation: 0,
      }
      set({ placedPieces: [...placedPieces, newPiece] })
      return
    }

    if (existing.toolbarKey === selectedToolbarKey) {
      const nextRotation = (((existing.rotation + 90) % 360) as Rotation)
      set({
        placedPieces: placedPieces.map((piece) =>
          piece.id === existing.id ? { ...piece, rotation: nextRotation } : piece,
        ),
      })
      return
    }

    set({
      placedPieces: placedPieces.map((piece) =>
        piece.id === existing.id ? { ...piece, toolbarKey: selectedToolbarKey, rotation: 0 } : piece,
      ),
    })
  },

  removePieceAt: (col, row) => {
    const { placedPieces, selectedPieceIds } = get()
    const removed = placedPieces.find((piece) => piece.col === col && piece.row === row)
    set({
      placedPieces: placedPieces.filter((piece) => !(piece.col === col && piece.row === row)),
      selectedPieceIds: removed
        ? selectedPieceIds.filter((id) => id !== removed.id)
        : selectedPieceIds,
    })
  },

  clearAll: () => set({ placedPieces: [], selectedPieceIds: [] }),

  loadLayout: (tier, pieces) => set({ tier, placedPieces: pieces, selectedPieceIds: [] }),
}))
