import { useState } from 'react'
import { ImportFromImage } from './components/ImportFromImage'
import { SiegeCalculator } from './components/SiegeCalculator'
import { useImportedBunkerStore } from './store/useImportedBunkerStore'

type Tab = 'siege' | 'import'

const TABS: { key: Tab; label: string }[] = [
  { key: 'siege', label: 'Siege Calculator' },
  { key: 'import', label: 'Import' },
]

function App() {
  const [tab, setTab] = useState<Tab>('import')
  const hasData = useImportedBunkerStore((state) => state.data !== null)

  return (
    <div className="grain min-h-screen bg-bg-dark text-cream">
      <div className="grain-overlay fixed z-0" aria-hidden="true" />

      <header className="sticky top-0 z-20 border-b border-gold/25 bg-bg-dark/92 backdrop-blur-md">
        {/* Fita fina em gold: assina o cabeçalho sem roubar espaço vertical. */}
        <div className="h-0.5 bg-gradient-to-r from-gold/70 via-gold/25 to-transparent" />
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-xl font-bold tracking-[0.14em] text-gold">UBGE</span>
            <span className="hidden h-4 w-px bg-cream/20 sm:block" />
            <span className="font-display text-sm tracking-wide text-cream/60">
              Bunker Siege Calculator
            </span>
            <span className="rounded border border-cream/15 px-1.5 py-px text-[10px] font-medium tracking-wide text-cream/40">
              FOXHOLE
            </span>
          </div>

          <nav className="flex gap-1 rounded-lg border border-cream/15 bg-ink/60 p-1">
            {TABS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setTab(option.key)}
                aria-current={tab === option.key ? 'page' : undefined}
                className={`relative rounded-md px-4 py-1.5 font-display text-sm font-medium tracking-wide transition-colors ${
                  tab === option.key
                    ? 'bg-gold text-bg-dark shadow-[0_1px_8px_-2px] shadow-gold/50'
                    : 'text-cream/60 hover:bg-cream/8 hover:text-cream'
                }`}
              >
                {option.label}
                {option.key === 'siege' && hasData && tab !== 'siege' && (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-good ring-2 ring-bg-dark"
                    title="Bunker loaded"
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {tab === 'siege' && <SiegeCalculator />}
        {tab === 'import' && <ImportFromImage onImported={() => setTab('siege')} />}
      </main>
    </div>
  )
}

export default App
