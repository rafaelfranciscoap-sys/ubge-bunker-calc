import { useState } from 'react'
import { ImportFromImage } from './components/ImportFromImage'
import { SiegeCalculator } from './components/SiegeCalculator'
import { useImportedBunkerStore } from './store/useImportedBunkerStore'

type Tab = 'siege' | 'import'

const TABS: { key: Tab; label: string }[] = [
  { key: 'siege', label: 'Simulação de Cerco' },
  { key: 'import', label: 'Importar' },
]

function App() {
  const [tab, setTab] = useState<Tab>('import')
  const hasData = useImportedBunkerStore((state) => state.data !== null)

  return (
    <div className="min-h-screen bg-bg-dark text-cream">
      <header className="sticky top-0 z-10 border-b border-gold/25 bg-bg-dark/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-gold">UBGE</span>
            <span className="text-sm text-cream/50">Simulador de Cerco · Foxhole</span>
          </div>
          <nav className="flex gap-1 rounded-lg border border-cream/15 bg-black/30 p-1">
            {TABS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setTab(option.key)}
                className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  tab === option.key
                    ? 'bg-gold text-bg-dark'
                    : 'text-cream/60 hover:bg-cream/5 hover:text-cream'
                }`}
              >
                {option.label}
                {option.key === 'siege' && hasData && tab !== 'siege' && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-olive" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main>
        {tab === 'siege' && <SiegeCalculator />}
        {tab === 'import' && <ImportFromImage onImported={() => setTab('siege')} />}
      </main>
    </div>
  )
}

export default App
