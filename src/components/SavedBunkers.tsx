import { useState } from 'react'
import { useImportedBunkerStore, type ImportedBunkerStats } from '../store/useImportedBunkerStore'
import { useSavedBunkersStore } from '../store/useSavedBunkersStore'

function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

// Barra de alvos conhecidos: salva o bunker carregado com um nome e traz qualquer um de volta
// com um clique. Guardado em localStorage, então sobrevive entre sessões e wars.
export function SavedBunkers({ current }: { current: ImportedBunkerStats }) {
  const bunkers = useSavedBunkersStore((s) => s.bunkers)
  const save = useSavedBunkersStore((s) => s.save)
  const remove = useSavedBunkersStore((s) => s.remove)
  const setData = useImportedBunkerStore((s) => s.setData)

  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')

  function commitSave() {
    save(name, current)
    setName('')
    setNaming(false)
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-cream/12 bg-ink/40 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="field-label flex-1">Saved targets</span>
        {naming ? (
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault()
              commitSave()
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setNaming(false)
                  setName('')
                }
              }}
              placeholder="Target name…"
              className="w-44 rounded border border-cream/25 bg-ink px-2 py-1 text-xs text-cream focus:border-gold focus:outline-none"
            />
            <button
              type="submit"
              className="rounded bg-gold px-2 py-1 font-display text-xs font-semibold text-bg-dark transition-colors hover:bg-gold/90"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setNaming(false)
                setName('')
              }}
              className="px-1 text-xs text-cream/50 transition-colors hover:text-cream"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="rounded border border-cream/25 px-2 py-1 font-display text-xs font-medium text-cream/75 transition-colors hover:border-gold/60 hover:text-gold"
          >
            + Save this bunker
          </button>
        )}
      </div>

      {bunkers.length === 0 ? (
        <p className="text-[11px] text-cream/40">
          Nothing saved yet. Store a bunker here to bring it back later without re-importing.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {bunkers.map((b) => (
            <span
              key={b.id}
              className="group flex items-center gap-1 rounded-full border border-cream/20 bg-surface pl-2.5 pr-1 py-1 text-xs transition-colors hover:border-gold/50"
            >
              <button
                type="button"
                onClick={() => setData(b.stats)}
                title={`${formatNumber(b.stats.hpTotal)} HP · ${
                  b.stats.integrityPercent !== null
                    ? `${Math.round(b.stats.integrityPercent)}% integrity`
                    : 'integrity —'
                } · saved ${new Date(b.savedAt).toLocaleDateString('en-US')}`}
                className="text-cream/85 transition-colors group-hover:text-gold"
              >
                {b.name}
                <span className="ml-1.5 text-cream/40">{formatNumber(b.stats.hpTotal)}</span>
              </button>
              <button
                type="button"
                onClick={() => remove(b.id)}
                aria-label={`Delete ${b.name}`}
                className="rounded-full px-1 text-cream/35 transition-colors hover:text-danger"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default SavedBunkers
