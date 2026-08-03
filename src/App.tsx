import { useState } from 'react'
import { ImportFromImage } from './components/ImportFromImage'
import { SiegeCalculator } from './components/SiegeCalculator'
import { UbgeMarkIcon } from './components/icons'
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
    <div className="relative flex min-h-screen flex-col bg-bg-dark text-cream">
      {/* Camadas decorativas de fundo — fixas, atrás de tudo, sem capturar cliques.
          Tudo desenhado aqui (hexes + brilho + grão): nenhum asset do jogo. */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div className="colonial-glow" />
        <div className="hex-field" />
        <div className="grain-overlay" />
      </div>

      <header className="sticky top-0 z-20 border-b border-gold/25 bg-bg-dark/88 backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-gold/70 via-gold/25 to-transparent" />
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <UbgeMarkIcon className="shrink-0 text-gold" width={26} height={26} />
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

      <main className="relative z-10 flex-1">
        {tab === 'siege' && <SiegeCalculator />}
        {tab === 'import' && <ImportFromImage onImported={() => setTab('siege')} />}
      </main>

      <footer className="relative z-10 mt-6 border-t border-cream/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-cream/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="flex items-center gap-2">
            <UbgeMarkIcon className="shrink-0 text-gold/70" width={18} height={18} />
            <span>
              <strong className="font-display font-semibold tracking-wide text-cream/80">
                Chico
              </strong>{' '}
              — Builder da UBGE
            </span>
          </span>
          <span className="leading-relaxed">
            Values from the Foxhole datamine (Update 65) · fan-made tool, not affiliated with Siege
            Camp
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
