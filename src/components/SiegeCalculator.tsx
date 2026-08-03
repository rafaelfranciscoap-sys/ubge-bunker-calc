import { useEffect, useMemo, useState } from 'react'
import { inferTierFromImport } from '../data/decay'
import {
  BUNKER_COLUMNS,
  SHELTER_AFFECTED_TYPES,
  SHELTER_BONUS_BY_COUNT,
  WEAPONS,
  type BunkerColumnKey,
} from '../data/weapons'
import {
  breachOutcome,
  effectiveDamagePerHit,
  shelterBonusPPForWeapon,
  type BreachOutcome,
} from '../engine/bunkerDestruction'
import { useImportedBunkerStore } from '../store/useImportedBunkerStore'
import { ImportedBunkerPanel } from './ImportedBunkerPanel'

// Rótulos das colunas — T1/T2/T3 e wet/dry são termos do jogo, mantidos em inglês.
const COLUMN_LABEL: Record<BunkerColumnKey, string> = {
  t1: 'T1',
  t2: 'T2',
  t3_wet: 'T3 wet',
  t3_dry: 'T3 dry',
}

function defaultColumnForTier(tier: 'T1' | 'T2' | 'T3' | null): BunkerColumnKey {
  if (tier === 'T3') return 't3_dry'
  if (tier === 'T2') return 't2'
  return 't1'
}

function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

// Cercos longos passam de uma hora — sem o campo de horas o número vira "127min 12s",
// que é difícil de ler de relance.
function formatSeconds(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`

  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = total % 60

  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  return `${minutes}m ${rest.toString().padStart(2, '0')}s`
}

function BreachBadge({ outcome }: { outcome: BreachOutcome }) {
  const style = !outcome.canBreach
    ? {
        text: 'This damage type cannot breach structures',
        cls: 'border-danger/40 bg-danger/10 text-danger',
      }
    : outcome.ignoresThreshold
      ? {
          text: 'Instant breach · ignores the breach threshold',
          cls: 'border-good/45 bg-good/10 text-good',
        }
      : {
          text: 'Breaches only after bunker HP drops to the threshold',
          cls: 'border-gold/40 bg-gold/10 text-gold',
        }
  return (
    <div
      className={`rounded-md border px-3 py-2 text-xs font-medium leading-snug ${style.cls}`}
      role="status"
    >
      {style.text}
    </div>
  )
}

// Barra de duas fases: torna visível a mecânica que o painel numérico esconde —
// quanto do cerco é "derrubar HP até o threshold" (fase 1) vs. "destruir na brecha" (fase 2).
function PhaseBar({
  hitsToOpenBreach,
  hitsToDestroy,
}: {
  hitsToOpenBreach: number
  hitsToDestroy: number
}) {
  if (!Number.isFinite(hitsToDestroy) || hitsToDestroy <= 0) return null
  const phase1 = Number.isFinite(hitsToOpenBreach) ? hitsToOpenBreach : 0
  const phase2 = hitsToDestroy - phase1
  const pct1 = Math.round((phase1 / hitsToDestroy) * 100)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-ink">
        {phase1 > 0 && (
          <div
            className="bg-danger/70"
            style={{ width: `${pct1}%` }}
            title={`Phase 1 — ${formatNumber(phase1)} hits to reach the threshold`}
          />
        )}
        <div
          className="flex-1 bg-gold/70"
          title={`Phase 2 — ${formatNumber(phase2)} hits inside the breach`}
        />
      </div>
      <div className="flex justify-between text-[11px] text-cream/45">
        <span>
          <span className="text-danger/80">Phase 1</span> to threshold · {formatNumber(phase1)}
        </span>
        <span>
          <span className="text-gold/80">Phase 2</span> in breach · {formatNumber(phase2)}
        </span>
      </div>
    </div>
  )
}

export function SiegeCalculator() {
  const data = useImportedBunkerStore((state) => state.data)

  const [weaponKey, setWeaponKey] = useState(WEAPONS.find((w) => w.key === '150mm')!.key)
  const [column, setColumn] = useState<BunkerColumnKey>('t3_dry')
  const [detectedColumn, setDetectedColumn] = useState<BunkerColumnKey | null>(null)
  const [guns, setGuns] = useState(1)
  const [reloadSeconds, setReloadSeconds] = useState(6)
  const [shelterCount, setShelterCount] = useState(0)

  useEffect(() => {
    if (!data) return
    const tier = inferTierFromImport(data.hpTotal, data.size, data.integrityPercent)
    const col = defaultColumnForTier(tier)
    setColumn(col)
    setDetectedColumn(col)
  }, [data])

  const weapon = WEAPONS.find((w) => w.key === weaponKey)!
  const inferredTier = data
    ? inferTierFromImport(data.hpTotal, data.size, data.integrityPercent)
    : null

  const shelterBonusPP = shelterBonusPPForWeapon(weapon, shelterCount)
  const shelterActive =
    shelterCount > 0 && SHELTER_AFFECTED_TYPES.has(weapon.damageTypeName) && !weapon.bypassesShelter
  const shelterBypassed = shelterCount > 0 && weapon.bypassesShelter

  // Para exibir a redução efetiva no tier selecionado.
  const currentColDef = BUNKER_COLUMNS.find((c) => c.key === column)
  const baseProfile = currentColDef ? weapon.profiles[currentColDef.profileTier] : 0
  const adjustedProfile = Math.max(0, baseProfile - shelterBonusPP)

  const result = useMemo(() => {
    if (!data || data.hpTotal === null) return null
    const perHit = effectiveDamagePerHit(weapon, column, shelterBonusPP)
    // data.breachHpAbsolute = HP que RESTA quando a brecha se expõe (foxbunker: "breach after Xhp"
    // já convertido para o complemento). A fase 1 precisa da quantidade a REMOVER até lá.
    const breachableHealth = data.breachHpAbsolute ?? 0
    const phase1Hp = Math.max(0, data.hpTotal - breachableHealth)
    const outcome = breachOutcome(data.hpTotal, phase1Hp, weapon, column, shelterBonusPP)
    const shotsPerSecond = guns > 0 && reloadSeconds > 0 ? guns / reloadSeconds : 0
    const timeOpenBreach =
      Number.isFinite(outcome.hitsToOpenBreach) && outcome.hitsToOpenBreach > 0 && shotsPerSecond > 0
        ? outcome.hitsToOpenBreach / shotsPerSecond
        : null
    const timeDestroy =
      Number.isFinite(outcome.hitsToDestroy) && shotsPerSecond > 0
        ? outcome.hitsToDestroy / shotsPerSecond
        : null
    return { perHit, outcome, timeOpenBreach, timeDestroy }
  }, [data, weapon, column, guns, reloadSeconds, shelterBonusPP])

  if (!data) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-wide text-gold">
          Siege Calculator
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-cream/60">
          No bunker loaded. Open the <strong className="text-cream">Import</strong> tab, copy your
          build from foxbunker.com and bring the numbers over to plan the siege here.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-wide text-gold">
          Siege Calculator
        </h1>
        <p className="text-sm text-cream/50">
          Bunker imported from foxbunker — modifiers already baked into the numbers.
        </p>
      </header>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Painel esquerdo — planejamento */}
        <section className="flex-1 overflow-hidden rounded-lg border border-gold/25 bg-surface shadow-lg shadow-black/40">
          <div className="border-b border-gold/15 bg-surface-raised px-4 py-2.5">
            <h2 className="font-display text-sm font-semibold tracking-[0.06em] text-gold uppercase">
              Attack Planning
            </h2>
          </div>

          {/* Barra de contexto do bunker importado */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gold/15 bg-gold/5 px-4 py-2">
            <span className="text-xs text-cream/70">
              <span className="font-semibold text-cream">{formatNumber(data.hpTotal)}</span> HP
            </span>
            <span className="text-xs text-cream/30">·</span>
            <span className="text-xs text-cream/70">
              <span className="font-semibold text-cream">
                {data.integrityPercent !== null ? `${Math.round(data.integrityPercent)}%` : '—'}
              </span>{' '}
              integrity
            </span>
            <span className="text-xs text-cream/30">·</span>
            <span className="text-xs text-cream/70">
              <span className="font-semibold text-danger">
                {data.breachPercent !== null ? `${Math.round(data.breachPercent)}%` : '—'}
              </span>{' '}
              breach
            </span>
            {inferredTier && (
              <span className="ml-auto rounded-full border border-good/40 bg-good/12 px-2.5 py-0.5 text-[11px] font-medium text-good">
                {inferredTier} detected
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4 p-4">
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Weapon</span>
              <select
                value={weaponKey}
                onChange={(e) => setWeaponKey(e.target.value)}
                className="rounded-md border border-cream/20 bg-ink px-3 py-2 text-sm text-cream transition-colors hover:border-cream/35 focus:border-gold focus:outline-none"
              >
                {WEAPONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label} · {opt.damage} {opt.damageTypeName}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="field-label">Bunker State</span>
              <div className="grid grid-cols-4 gap-1.5">
                {BUNKER_COLUMNS.map((col) => (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => setColumn(col.key)}
                    aria-pressed={column === col.key}
                    className={`relative rounded-md border px-2 py-2 font-display text-xs font-medium tracking-wide transition-colors ${
                      column === col.key
                        ? 'border-gold bg-gold text-bg-dark'
                        : detectedColumn === col.key
                          ? 'border-gold/40 text-cream/90 hover:border-gold/60'
                          : 'border-cream/20 text-cream/70 hover:border-gold/50 hover:text-cream'
                    }`}
                  >
                    {COLUMN_LABEL[col.key]}
                    {detectedColumn === col.key && column !== col.key && (
                      <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-good" />
                    )}
                  </button>
                ))}
              </div>
              {detectedColumn && (
                <p className="text-[11px] text-cream/40">
                  Pre-selected from the detected tier · click to change
                </p>
              )}
            </div>

            {/* Artillery Shelter Rooms — termo do jogo, mantido */}
            <div className="flex flex-col gap-1.5">
              <span className="field-label">Artillery Shelter Rooms</span>
              <div className="grid grid-cols-4 gap-1.5">
                {([0, 1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setShelterCount(n)}
                    aria-pressed={shelterCount === n}
                    className={`rounded-md border py-2 font-display text-xs font-medium tracking-wide transition-colors ${
                      shelterCount === n
                        ? 'border-good/60 bg-good/18 text-good'
                        : 'border-cream/20 text-cream/60 hover:border-cream/40 hover:text-cream/85'
                    }`}
                  >
                    {n === 0 ? 'None' : `${n}×`}
                  </button>
                ))}
              </div>
              {shelterCount > 0 && (
                <p className="text-[11px] text-cream/45">
                  {shelterActive
                    ? `${COLUMN_LABEL[column]}: ${Math.round(baseProfile * 100)}% → ${Math.round(adjustedProfile * 100)}% damage passes · −${Math.round(SHELTER_BONUS_BY_COUNT[Math.min(shelterCount, SHELTER_BONUS_BY_COUNT.length - 1)] * 100)}pp vs High Explosive`
                    : shelterBypassed
                      ? '300mm bypasses the shelter bonus'
                      : `Does not affect ${weapon.damageTypeName} damage`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="field-label">Guns</span>
                <input
                  type="number"
                  min={1}
                  value={guns}
                  onChange={(e) => setGuns(Math.max(1, Number(e.target.value)))}
                  className="rounded-md border border-cream/20 bg-ink px-3 py-2 text-sm text-cream transition-colors hover:border-cream/35 focus:border-gold focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="field-label">Reload (s)</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={reloadSeconds}
                  onChange={(e) => setReloadSeconds(Math.max(0.1, Number(e.target.value)))}
                  className="rounded-md border border-cream/20 bg-ink px-3 py-2 text-sm text-cream transition-colors hover:border-cream/35 focus:border-gold focus:outline-none"
                />
              </label>
            </div>

            {result && (
              <div className="flex flex-col gap-3 border-t border-cream/10 pt-4">
                <BreachBadge outcome={result.outcome} />

                {result.outcome.canBreach ? (
                  <>
                    {/* Os dois números que decidem o cerco */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col items-center rounded-lg border border-danger/30 bg-danger/8 px-3 py-4 text-center">
                        {result.outcome.ignoresThreshold ? (
                          <span className="font-display text-2xl font-bold leading-none text-danger">
                            INSTANT
                          </span>
                        ) : (
                          <span className="font-display text-[2.75rem] font-bold leading-none text-danger">
                            {formatNumber(result.outcome.hitsToOpenBreach)}
                          </span>
                        )}
                        <span className="field-label mt-2 !text-[10px] !tracking-[0.1em]">
                          {result.outcome.ignoresThreshold ? 'Breach' : 'Hits to breach'}
                        </span>
                        {!weapon.placed && result.timeOpenBreach !== null && (
                          <span className="mt-1 text-xs text-cream/45">
                            {formatSeconds(result.timeOpenBreach)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-center rounded-lg border border-gold/30 bg-gold/8 px-3 py-4 text-center">
                        <span className="font-display text-[2.75rem] font-bold leading-none text-gold">
                          {formatNumber(result.outcome.hitsToDestroy)}
                        </span>
                        <span className="field-label mt-2 !text-[10px] !tracking-[0.1em]">
                          Hits to destroy
                        </span>
                        {!weapon.placed && result.timeDestroy !== null && (
                          <span className="mt-1 text-xs text-cream/45">
                            {formatSeconds(result.timeDestroy)}
                          </span>
                        )}
                      </div>
                    </div>

                    {!result.outcome.ignoresThreshold && (
                      <PhaseBar
                        hitsToOpenBreach={result.outcome.hitsToOpenBreach}
                        hitsToDestroy={result.outcome.hitsToDestroy}
                      />
                    )}

                    <div className="flex items-center justify-between rounded-md border border-cream/8 bg-ink/70 px-3 py-2">
                      <span className="text-xs text-cream/60">Damage per hit</span>
                      <span className="text-xs text-cream">
                        {formatNumber(result.perHit)} HP
                        {shelterActive && (
                          <span className="ml-1 text-good/75">(shelter active)</span>
                        )}
                        {result.outcome.breachingModifier !== 1 && (
                          <span className="ml-1 text-cream/50">
                            (×{result.outcome.breachingModifier} in breach)
                          </span>
                        )}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-xs leading-relaxed text-danger">
                    {weapon.label} ({weapon.damageTypeName}){' '}
                    <strong>cannot breach structures</strong> — it drains the shared HP pool but
                    never destroys pieces. Use Explosive, High Explosive or Demolition damage to
                    breach.
                  </p>
                )}
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-cream/40">
              {weapon.placed
                ? 'Placed charge (satchel / tripod) — counts the number of charges, no reload time.'
                : '"Reload" is the time per shot for each gun (varies by weapon and crew).'}{' '}
              <strong className="text-cream/60">T3 wet</strong> = freshly poured concrete (takes 10×
              damage during the 24h curing window);{' '}
              <strong className="text-cream/60">T3 dry</strong> = fully cured.
            </p>
          </div>
        </section>

        {/* Painel direito — estatísticas do bunker */}
        <aside className="w-full lg:w-96">
          <ImportedBunkerPanel shelterCount={shelterCount} />
        </aside>
      </div>
    </div>
  )
}

export default SiegeCalculator
