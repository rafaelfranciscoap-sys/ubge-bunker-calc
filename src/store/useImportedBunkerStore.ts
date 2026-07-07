import { create } from 'zustand'
import type { BuilderTier } from './useBunkerBuilderStore'

// Campos extraídos de um card de stats (foxbunker.com / foxholeplanner / tela de upgrade do
// jogo) via ImportFromImage.tsx. `null` = campo não visível/legível na imagem — nunca inventado.
export interface ImportedBunkerStats {
  hpTotal: number | null
  breachPercent: number | null
  breachHpAbsolute: number | null
  integrityPercent: number | null
  size: number | null
  repairCost: number | null
  repairBmat: number | null
  // Custo de construção (linha "conc/bmat/dig" do foxbunker). Opcional: o import por imagem
  // não extrai esses campos. `undefined` = método sem custo; `null` = campo não lido.
  constructionConcrete?: number | null
  constructionBmat?: number | null
  constructionDigging?: number | null
}

interface ImportedBunkerState {
  data: ImportedBunkerStats | null
  /** Tier escolhido manualmente pelo usuário junto com a importação — a imagem não indica
   * de forma confiável T1/T2/T3, e a resistência base depende disso (ver siegeCalculator.ts). */
  tier: BuilderTier
  /** Se true, o SiegeCalculator usa estes dados em vez dos calculados a partir do BunkerBuilder. */
  isActive: boolean
  setData: (data: ImportedBunkerStats) => void
  setTier: (tier: BuilderTier) => void
  setActive: (active: boolean) => void
  clear: () => void
}

export const useImportedBunkerStore = create<ImportedBunkerState>((set) => ({
  data: null,
  tier: 'T3',
  isActive: false,
  setData: (data) => set({ data }),
  setTier: (tier) => set({ tier }),
  setActive: (active) => set({ isActive: active }),
  clear: () => set({ data: null, isActive: false }),
}))
