import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ImportedBunkerStats } from './useImportedBunkerStore'

// Alvos conhecidos que o regimento quer guardar entre sessões (ex.: "Deadlands - Callahan's",
// "Base do clã X"). Persistido em localStorage — explicitamente permitido pelo CLAUDE.md fora
// do ambiente claude.ai — via o middleware `persist` do Zustand, mesmo padrão do
// useSavedDesignsStore (que guarda builds do Construtor, não bunkers importados).
export interface SavedBunker {
  id: string
  name: string
  savedAt: string
  stats: ImportedBunkerStats
}

// Teto para não deixar o localStorage crescer sem limite; ao passar, o mais antigo cai.
const MAX_SAVED = 24

interface SavedBunkersState {
  bunkers: SavedBunker[]
  save: (name: string, stats: ImportedBunkerStats) => void
  remove: (id: string) => void
}

export const useSavedBunkersStore = create<SavedBunkersState>()(
  persist(
    (set, get) => ({
      bunkers: [],

      save: (name, stats) => {
        const bunker: SavedBunker = {
          id: crypto.randomUUID(),
          name: name.trim() || 'Untitled bunker',
          savedAt: new Date().toISOString(),
          stats,
        }
        set({ bunkers: [bunker, ...get().bunkers].slice(0, MAX_SAVED) })
      },

      remove: (id) => set({ bunkers: get().bunkers.filter((b) => b.id !== id) }),
    }),
    { name: 'ubge-bunker-calc:saved-bunkers' },
  ),
)
