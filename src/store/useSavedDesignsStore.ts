import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BuilderTier, PlacedPiece } from './useBunkerBuilderStore'

export interface SavedDesign {
  id: string
  name: string
  savedAt: string
  tier: BuilderTier
  pieces: PlacedPiece[]
}

interface SavedDesignsState {
  designs: SavedDesign[]
  saveDesign: (name: string, tier: BuilderTier, pieces: PlacedPiece[]) => void
  deleteDesign: (id: string) => void
}

// Persistido em localStorage (explicitamente permitido pelo CLAUDE.md fora do ambiente
// claude.ai) via o middleware `persist` do próprio Zustand.
export const useSavedDesignsStore = create<SavedDesignsState>()(
  persist(
    (set, get) => ({
      designs: [],

      saveDesign: (name, tier, pieces) => {
        const design: SavedDesign = {
          id: crypto.randomUUID(),
          name,
          savedAt: new Date().toISOString(),
          tier,
          pieces,
        }
        set({ designs: [design, ...get().designs] })
      },

      deleteDesign: (id) => set({ designs: get().designs.filter((design) => design.id !== id) }),
    }),
    { name: 'ubge-bunker-calc:saved-designs' },
  ),
)
