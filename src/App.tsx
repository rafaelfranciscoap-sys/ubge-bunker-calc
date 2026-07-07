import { useState } from 'react'
import { ImportFromImage } from './components/ImportFromImage'
import { SiegeCalculator } from './components/SiegeCalculator'
import { useImportedBunkerStore } from './store/useImportedBunkerStore'

type Tab = 'siege' | 'import'

const TABS: { key: Tab; label: string; abbr: string }[] = [
  { key: 'import', label: 'Importar', abbr: 'IMP' },
  { key: 'siege', label: 'Simulação de Cerco', abbr: 'SIM' },
]

function App() {
  const [tab, setTab] = useState<Tab>('import')
  const hasData = useImportedBunkerStore((state) => state.data !== null)

  return (
    <div className="min-h-screen bg-bg-dark text-cream tactical-bg">
      <header className="sticky top-0 z-10 border-b border-gold/20 bg-bg-dark/98 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-0 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-3 py-3">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-1 bg-gold" />
              <span className="font-mono text-xs font-bold tracking-[0.2em] text-gold uppercase">UBGE</span>
            </div>
            <div className="hidden h-4 w-px bg-cream/20 sm:block" />
            <span className="hidden font-mono text-[10px] tracking-widest text-cream-dim uppercase sm:block">
              Simulador de Cerco · Foxhole
            </span>
          </div>

          {/* Status indicator */}
          {hasData && (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-olive animate-pulse" />
              <span className="font-mono text-[10px] tracking-widest text-olive/70 uppercase">Bunker Carregado</span>
            </div>
          )}

          {/* Nav tabs */}
          <nav className="flex h-full">
            {TABS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setTab(option.key)}
                className={`relative flex h-full items-center gap-2 border-b-2 px-4 py-3 font-mono text-[11px] tracking-widest uppercase transition-all sm:px-6 ${
                  tab === option.key
                    ? 'border-gold text-gold'
                    : 'border-transparent text-cream/40 hover:border-cream/20 hover:text-cream/70'
                }`}
              >
                <span className="hidden sm:inline">{option.label}</span>
                <span className="sm:hidden">{option.abbr}</span>
                {option.key === 'siege' && hasData && tab !== 'siege' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-olive" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="min-h-[calc(100vh-49px)]">
        {tab === 'siege' && <SiegeCalculator />}
        {tab === 'import' && <ImportFromImage onImported={() => setTab('siege')} />}
      </main>
    </div>
  )
}

export default App
