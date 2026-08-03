import { useMemo, useState } from 'react'
import {
  BUNKER_PIECES,
  TIER_LABEL,
  type BunkerTierKey,
} from '../data/bunkerPieces'
import { bunkerHealth, COMPACT_BONUS_MAX } from '../engine/bunkerHealth'

const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`

// Curva de decaimento do produto de integridade — o "aha" da mecânica: cada peça multiplica,
// então a queda é exponencial e nenhuma quantidade de conexões compensa um bunker grande.
function DecayCurve({ pieceCount }: { pieceCount: number }) {
  const MAX_N = 40
  const W = 560
  const H = 140
  const PAD = 4

  const points = Array.from({ length: MAX_N + 1 }, (_, n) => {
    const v = Math.pow(0.97, n)
    const x = PAD + (n / MAX_N) * (W - PAD * 2)
    const y = PAD + (1 - v) * (H - PAD * 2)
    return { n, v, x, y }
  })

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const here = points[Math.min(pieceCount, MAX_N)]

  return (
    <div className="flex flex-col gap-1.5">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Integrity decay curve">
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={PAD}
            x2={W - PAD}
            y1={PAD + (1 - g) * (H - PAD * 2)}
            y2={PAD + (1 - g) * (H - PAD * 2)}
            stroke="currentColor"
            className="text-cream/10"
            strokeWidth={1}
          />
        ))}
        <path d={path} fill="none" stroke="currentColor" className="text-gold" strokeWidth={2} />
        <line
          x1={here.x}
          x2={here.x}
          y1={PAD}
          y2={H - PAD}
          stroke="currentColor"
          className="text-danger/50"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <circle cx={here.x} cy={here.y} r={4} className="fill-danger" />
      </svg>
      <div className="flex justify-between text-[10px] text-cream/40">
        <span>1 piece</span>
        <span>
          {pieceCount} {pieceCount === 1 ? 'piece' : 'pieces'} → {pct(Math.pow(0.97, pieceCount))} (plain pieces only)
        </span>
        <span>{MAX_N}</span>
      </div>
    </div>
  )
}

export function HowItWorks() {
  const [tier, setTier] = useState<BunkerTierKey>('t3')
  const [counts, setCounts] = useState<Record<string, number>>({ bunker: 9 })
  const [connectionRatio, setConnectionRatio] = useState(0.5)

  const pieces = useMemo(
    () =>
      BUNKER_PIECES.flatMap((p) =>
        Array.from({ length: counts[p.key] ?? 0 }, () => p),
      ),
    [counts],
  )

  const result = useMemo(
    () =>
      bunkerHealth(
        pieces.map((p) => p.hp[tier]),
        pieces.map((p) => p.integrity),
        connectionRatio * 100,
        100,
      ),
    [pieces, tier, connectionRatio],
  )

  const shelterCount = pieces.filter((p) => p.isShelter).length
  // Mesmo bunker trocando cada shelter por uma peça comum — quantifica o custo da troca.
  const withoutShelters = useMemo(
    () =>
      bunkerHealth(
        pieces.map((p) => p.hp[tier]),
        pieces.map((p) => (p.isShelter ? 0.97 : p.integrity)),
        connectionRatio * 100,
        100,
      ),
    [pieces, tier, connectionRatio],
  )

  function bump(key: string, delta: number) {
    setCounts((c) => {
      const next = Math.max(0, Math.min(40, (c[key] ?? 0) + delta))
      return { ...c, [key]: next }
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-wide text-gold">
          How Bunker Health Works
        </h1>
        <p className="text-sm text-cream/50">
          Where the HP number on your bunker actually comes from — and why big bunkers are weak.
        </p>
      </header>

      {/* ── A fórmula ─────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-lg border border-gold/25 bg-surface shadow-lg shadow-black/40">
        <div className="border-b border-gold/15 bg-surface-raised px-4 py-2.5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-gold">
            The formula
          </h2>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <div className="overflow-x-auto rounded-md border border-cream/10 bg-ink px-4 py-3">
            <code className="whitespace-nowrap font-mono text-sm text-cream">
              HP = <span className="text-good">raw HP</span> × ({' '}
              <span className="text-gold">∏ integrity of each piece</span> +{' '}
              <span className="text-danger">compact bonus</span> )
            </code>
          </div>
          <ul className="flex flex-col gap-2 text-sm leading-relaxed text-cream/70">
            <li>
              <span className="text-good">Raw HP</span> — just the sum of each piece's Max Health.
            </li>
            <li>
              <span className="text-gold">Integrity</span> — every piece <em>multiplies</em> the
              total. A plain bunker piece is 0.97, so nine of them give 0.97⁹ ={' '}
              {pct(Math.pow(0.97, 9))}. This is why growth hurts <strong>exponentially</strong>.
            </li>
            <li>
              <span className="text-danger">Compact bonus</span> — connections between pieces give
              some back, <em>additively</em>, up to +{pct(COMPACT_BONUS_MAX, 0)}. A linear rescue,
              with a ceiling.
            </li>
          </ul>
          <p className="rounded-md border border-cream/10 bg-ink/60 px-3 py-2 text-[11px] leading-relaxed text-cream/50">
            Sprawling bunkers are fragile, tight blocks are strong — and no amount of packing
            saves an oversized one, because the ceiling is only +{pct(COMPACT_BONUS_MAX, 0)}.
          </p>
        </div>
      </section>

      {/* ── Calculadora ───────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-lg border border-cream/12 bg-surface shadow-lg shadow-black/40">
        <div className="border-b border-cream/10 bg-surface-raised px-4 py-2.5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-cream/70">
            Build one and watch it compute
          </h2>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <span className="field-label">Tier</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['t1', 't2', 't3'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  aria-pressed={tier === t}
                  className={`rounded-md border py-2 font-display text-xs font-medium tracking-wide transition-colors ${
                    tier === t
                      ? 'border-gold bg-gold text-bg-dark'
                      : 'border-cream/20 text-cream/70 hover:border-gold/50'
                  }`}
                >
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="field-label">Pieces</span>
            <div className="flex flex-col gap-1">
              {BUNKER_PIECES.map((p) => {
                const n = counts[p.key] ?? 0
                return (
                  <div
                    key={p.key}
                    className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                      n > 0 ? 'border-cream/20 bg-ink/60' : 'border-cream/8'
                    }`}
                  >
                    <span className={`flex-1 ${n > 0 ? 'text-cream/90' : 'text-cream/45'}`}>
                      {p.label}
                      {p.isShelter && (
                        <span className="ml-1.5 rounded-sm bg-good/15 px-1 text-[9px] text-good/80">
                          shelter
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[11px] text-cream/40">
                      {fmt(p.hp[tier])} HP · SI {p.integrity}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => bump(p.key, -1)}
                        aria-label={`Remove one ${p.label}`}
                        className="h-6 w-6 rounded border border-cream/20 text-cream/60 transition-colors hover:border-danger/60 hover:text-danger"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-semibold text-cream">{n}</span>
                      <button
                        type="button"
                        onClick={() => bump(p.key, 1)}
                        aria-label={`Add one ${p.label}`}
                        className="h-6 w-6 rounded border border-cream/20 text-cream/60 transition-colors hover:border-gold/60 hover:text-gold"
                      >
                        +
                      </button>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="field-label">
              Connections — {pct(connectionRatio, 0)} of the maximum
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(connectionRatio * 100)}
              onChange={(e) => setConnectionRatio(Number(e.target.value) / 100)}
              className="w-full accent-[var(--color-gold)]"
            />
            <span className="text-[11px] text-cream/40">
              This is the <code className="text-cream/60">(12/24)</code> part of the foxbunker card.
            </span>
          </label>

          {/* Resultado, escrito como a conta */}
          {pieces.length === 0 ? (
            <p className="rounded-md border border-cream/10 bg-ink/60 px-3 py-3 text-sm text-cream/50">
              Add at least one piece to see the calculation.
            </p>
          ) : (
            <div className="flex flex-col gap-3 rounded-md border border-gold/25 bg-ink/70 p-3">
              <div className="overflow-x-auto">
                <code className="whitespace-nowrap font-mono text-xs text-cream/80">
                  <span className="text-good">{fmt(result.rawHp)}</span> × ({' '}
                  <span className="text-gold">{result.integrity.toFixed(4)}</span> +{' '}
                  <span className="text-danger">{result.bonus.toFixed(4)}</span> ) ={' '}
                  <span className="font-bold text-cream">{fmt(result.finalHp)}</span>
                </code>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'raw HP', value: fmt(result.rawHp), color: 'text-good' },
                  { label: 'integrity', value: pct(result.integrity), color: 'text-gold' },
                  { label: 'compact bonus', value: `+${pct(result.bonus)}`, color: 'text-danger' },
                  { label: 'final HP', value: fmt(result.finalHp), color: 'text-cream' },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="flex flex-col items-center rounded border border-cream/8 bg-black/25 py-2 text-center"
                  >
                    <span className={`font-display text-lg font-semibold leading-tight ${c.color}`}>
                      {c.value}
                    </span>
                    <span className="text-[10px] text-cream/50">{c.label}</span>
                  </div>
                ))}
              </div>

              {shelterCount > 0 && (
                <p className="rounded border border-good/25 bg-good/8 px-2.5 py-2 text-[11px] leading-relaxed text-good/90">
                  {shelterCount === 1
                    ? 'That Artillery Shelter costs you '
                    : `Those ${shelterCount} Artillery Shelters cost you `}
                  <strong>{fmt(withoutShelters.finalHp - result.finalHp)} HP</strong> (
                  {pct(1 - result.finalHp / withoutShelters.finalHp)} of the total) — swapping a
                  0.97 piece for a 0.82 one. That is the price for +15pp artillery resistance on the
                  pieces next to them.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5 border-t border-cream/10 pt-3">
            <span className="field-label">Why growth hurts — integrity of N plain pieces</span>
            <DecayCurve pieceCount={pieces.length} />
          </div>
        </div>
      </section>

      {/* ── Decodificador do card ─────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-lg border border-cream/12 bg-surface shadow-lg shadow-black/40">
        <div className="border-b border-cream/10 bg-surface-raised px-4 py-2.5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-cream/70">
            Reading the foxbunker card
          </h2>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <p className="text-sm leading-relaxed text-cream/70">
            Once you know the formula, the stats card stops being magic — every number on it is a
            term of the equation:
          </p>
          <div className="overflow-x-auto rounded-md border border-cream/10 bg-ink px-4 py-3">
            <pre className="font-mono text-xs leading-relaxed text-cream/80">
{`📊 76.0%  +  7.5%  integ  (12/24)
   │         │              │
   │         │              └─ connections made / possible
   │         └─ compact bonus  = 12/24 × 0.15
   └─ integrity product        = 0.97⁹

🛠️ 28,189hp (83.5% integ, size 9)
             └─ 76.0 + 7.5, the two terms added`}
            </pre>
          </div>
          <p className="text-[11px] leading-relaxed text-cream/45">
            Worked example, 9 plain T3 pieces: 9 × 3,750 = 33,750 raw HP. 0.97⁹ = 76.02%, plus
            12/24 × 0.15 = 7.5%, giving 83.52%. And 33,750 × 0.8352 = 28,189 HP — the exact number
            on the card.
          </p>
          <p className="rounded-md border border-warn/25 bg-warn/8 px-2.5 py-2 text-[11px] leading-relaxed text-warn/90">
            Careful: the +15pp ceiling of the compact bonus and the +15pp of the Artillery Shelter
            are the same number by coincidence, but different things. One is bonus HP from packing
            pieces together; the other is damage resistance against High Explosive.
          </p>
        </div>
      </section>

      <p className="text-[11px] leading-relaxed text-cream/40">
        Max Health and Structural Integrity per piece come from the Foxhole datamine (Update 65).
        The formula shape was verified against three independent cases, including a real bunker
        imported from foxbunker, matching to the HP.
      </p>
    </div>
  )
}

export default HowItWorks
