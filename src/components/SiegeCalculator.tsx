import { useEffect, useMemo, useState } from 'react'
import { inferTierFromImport } from '../data/decay'
import { BUNKER_COLUMNS, SHELTER_AFFECTED_TYPES, SHELTER_BONUS_BY_COUNT, WEAPONS, type BunkerColumnKey } from '../data/weapons'
import { breachOutcome, effectiveDamagePerHit, shelterBonusPPForWeapon, type BreachOutcome } from '../engine/bunkerDestruction'
import { useImportedBunkerStore } from '../store/useImportedBunkerStore'
import { ImportedBunkerPanel } from './ImportedBunkerPanel'

const COLUMN_LABEL_PT: Record<BunkerColumnKey, string> = {
  t1: 'T1',
  t2: 'T2',
  t3_wet: 'T3 mol.',
  t3_dry: 'T3 seco',
}

function defaultColumnForTier(tier: 'T1' | 'T2' | 'T3' | null): BunkerColumnKey {
  if (tier === 'T3') return 't3_dry'
  if (tier === 'T2') return 't2'
  return 't1'
}

function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value)
}

function formatSeconds(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return `${minutes}min ${rest.toString().padStart(2, '0')}s`
}

function BreachBadge({ outcome }: { outcome: BreachOutcome }) {
  const style = !outcome.canBreach
    ? { text: 'AP NÃO CAUSA BREACH', cls: 'border-rust/40 bg-rust/10 text-rust', dot: 'bg-rust' }
    : outcome.ignoresThreshold
      ? { text: 'BREACH IMEDIATO · IGNORA THRESHOLD', cls: 'border-olive/50 bg-olive/10 text-olive', dot: 'bg-olive' }
      : { text: 'BREACH APÓS THRESHOLD', cls: 'border-gold/40 bg-gold/8 text-gold', dot: 'bg-gold' }
  return (
    <div className={`flex items-center gap-2 rounded border px-3 py-2 font-mono text-[10px] tracking-widest uppercase ${style.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`} />
      {style.text}
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="font-mono text-[9px] tracking-[0.2em] text-cream/30 uppercase">{label}</span>
      <div className="flex-1 h-px bg-cream/10" />
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
  const shelterActive = shelterCount > 0 && SHELTER_AFFECTED_TYPES.has(weapon.damageTypeName) && !weapon.bypassesShelter
  const shelterBypassed = shelterCount > 0 && weapon.bypassesShelter

  const currentColDef = BUNKER_COLUMNS.find(c => c.key === column)
  const baseProfile = currentColDef ? weapon.profiles[currentColDef.profileTier] : 0
  const adjustedProfile = Math.max(0, baseProfile - shelterBonusPP)

  const result = useMemo(() => {
    if (!data || data.hpTotal === null) return null
    const perHit = effectiveDamagePerHit(weapon, column, shelterBonusPP)
    const breachableHealth = data.breachHpAbsolute ?? 0
    const outcome = breachOutcome(data.hpTotal, breachableHealth, weapon, column, shelterBonusPP)
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
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/20 bg-gold/5">
          <div className="h-8 w-8 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
        </div>
        <div>
          <h1 className="font-mono text-sm font-bold tracking-[0.15em] text-gold uppercase">Aguardando dados</h1>
          <p className="mt-2 max-w-sm font-mono text-[11px] text-cream/40 leading-relaxed">
            Nenhum bunker carregado. Vá até a aba{' '}
            <strong className="text-cream/70">IMPORTAR</strong>, copie a build do foxbunker.com e traga
            os dados para simular o cerco.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-0 p-4 sm:p-6">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-0.5 bg-gold" />
            <h1 className="font-mono text-xs font-bold tracking-[0.2em] text-gold uppercase">Simulação de Cerco</h1>
          </div>
          <p className="mt-1 font-mono text-[10px] text-cream/30 tracking-wider">
            Bunker importado do foxbunker — modificações embutidas nos cálculos
          </p>
        </div>

        {/* Bunker status bar */}
        <div className="flex flex-wrap items-center gap-1">
          <StatChip label="HP" value={formatNumber(data.hpTotal)} color="text-cream" />
          <StatChip label="INTEG" value={data.integrityPercent !== null ? `${Math.round(data.integrityPercent)}%` : '—'} color="text-cream" />
          <StatChip label="BREACH" value={data.breachPercent !== null ? `${Math.round(data.breachPercent)}%` : '—'} color="text-rust" />
          {inferredTier && (
            <span className="rounded border border-olive/40 bg-olive/10 px-2 py-0.5 font-mono text-[9px] tracking-[0.15em] text-olive uppercase">
              {inferredTier} detectado
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Left panel — Attack planning */}
        <section className="flex-1 overflow-hidden rounded border border-cream/10 bg-bg-panel">
          {/* Panel header */}
          <div className="flex items-center gap-3 border-b border-cream/10 bg-black/30 px-4 py-2.5">
            <div className="h-3 w-3 rounded-full border border-gold/50 bg-gold/20" />
            <h2 className="font-mono text-[10px] font-bold tracking-[0.2em] text-cream/70 uppercase">Planejamento de Ataque</h2>
          </div>

          <div className="flex flex-col gap-5 p-4">

            {/* Weapon selector */}
            <div>
              <SectionHeader label="Arma selecionada" />
              <select
                value={weaponKey}
                onChange={(e) => setWeaponKey(e.target.value)}
                className="w-full rounded border border-cream/15 bg-black/40 px-3 py-2.5 font-mono text-xs text-cream focus:border-gold/60 focus:outline-none transition-colors"
              >
                {WEAPONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label} · {opt.damage} {opt.damageTypeName}
                  </option>
                ))}
              </select>
            </div>

            {/* Bunker state selector */}
            <div>
              <SectionHeader label="Estado do bunker" />
              <div className="grid grid-cols-4 gap-1.5">
                {BUNKER_COLUMNS.map((col) => (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => setColumn(col.key)}
                    className={`relative rounded border py-2.5 font-mono text-[10px] font-bold tracking-widest uppercase transition-all ${
                      column === col.key
                        ? 'border-gold bg-gold/15 text-gold'
                        : detectedColumn === col.key
                          ? 'border-gold/30 text-cream/70 hover:border-gold/50 hover:text-cream'
                          : 'border-cream/10 text-cream/40 hover:border-cream/25 hover:text-cream/70'
                    }`}
                  >
                    {COLUMN_LABEL_PT[col.key]}
                    {detectedColumn === col.key && column !== col.key && (
                      <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-olive" />
                    )}
                  </button>
                ))}
              </div>
              {detectedColumn && (
                <p className="mt-1.5 font-mono text-[9px] text-cream/25 tracking-wider">
                  Pré-selecionado pelo tier detectado · clique para alterar
                </p>
              )}
            </div>

            {/* Artillery Shelter */}
            <div>
              <SectionHeader label="Artillery Shelter Rooms" />
              <div className="grid grid-cols-4 gap-1.5">
                {([0, 1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setShelterCount(n)}
                    className={`rounded border py-2.5 font-mono text-[10px] font-bold tracking-widest uppercase transition-all ${
                      shelterCount === n
                        ? 'border-olive/60 bg-olive/15 text-olive'
                        : 'border-cream/10 text-cream/40 hover:border-cream/25 hover:text-cream/70'
                    }`}
                  >
                    {n === 0 ? 'NENHUM' : `${n}×`}
                  </button>
                ))}
              </div>
              {shelterCount > 0 && (
                <p className="mt-1.5 font-mono text-[9px] text-cream/25 tracking-wider">
                  {shelterActive
                    ? `${COLUMN_LABEL_PT[column]}: passa ${Math.round(baseProfile * 100)}%→${Math.round(adjustedProfile * 100)}% · −${Math.round(SHELTER_BONUS_BY_COUNT[Math.min(shelterCount, SHELTER_BONUS_BY_COUNT.length - 1)] * 100)}pp resist. HE`
                    : shelterBypassed
                      ? '300mm ignora o shelter bonus'
                      : `não afeta ${weapon.damageTypeName}`}
                </p>
              )}
            </div>

            {/* Guns + reload */}
            <div>
              <SectionHeader label="Configuração de fogo" />
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] tracking-[0.15em] text-cream/30 uppercase">Canhões</span>
                  <input
                    type="number"
                    min={1}
                    value={guns}
                    onChange={(e) => setGuns(Math.max(1, Number(e.target.value)))}
                    className="rounded border border-cream/15 bg-black/40 px-3 py-2.5 font-mono text-sm text-cream focus:border-gold/60 focus:outline-none transition-colors tabular-nums"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] tracking-[0.15em] text-cream/30 uppercase">Recarga (s)</span>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={reloadSeconds}
                    onChange={(e) => setReloadSeconds(Math.max(0.1, Number(e.target.value)))}
                    className="rounded border border-cream/15 bg-black/40 px-3 py-2.5 font-mono text-sm text-cream focus:border-gold/60 focus:outline-none transition-colors tabular-nums"
                  />
                </label>
              </div>
            </div>

            {/* Results */}
            {result && (
              <div className="flex flex-col gap-3 border-t border-cream/10 pt-5">
                <SectionHeader label="Resultado calculado" />
                <BreachBadge outcome={result.outcome} />

                {result.outcome.canBreach ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Breach card */}
                      <div className="flex flex-col rounded border border-rust/25 bg-rust/8 p-4">
                        <span className="font-mono text-[9px] tracking-[0.2em] text-rust/60 uppercase mb-2">
                          {result.outcome.ignoresThreshold ? 'Breach' : 'Hits p/ breach'}
                        </span>
                        {result.outcome.ignoresThreshold ? (
                          <span className="font-mono text-lg font-bold text-rust leading-none">IMEDIATO</span>
                        ) : (
                          <span className="font-mono text-4xl font-bold tabular-nums text-rust leading-none">
                            {formatNumber(result.outcome.hitsToOpenBreach)}
                          </span>
                        )}
                        {!weapon.placed && result.timeOpenBreach !== null && (
                          <span className="mt-2 font-mono text-[10px] text-rust/50">
                            {formatSeconds(result.timeOpenBreach)}
                          </span>
                        )}
                      </div>

                      {/* Destroy card */}
                      <div className="flex flex-col rounded border border-gold/25 bg-gold/8 p-4">
                        <span className="font-mono text-[9px] tracking-[0.2em] text-gold/60 uppercase mb-2">
                          Hits p/ destruir
                        </span>
                        <span className="font-mono text-4xl font-bold tabular-nums text-gold leading-none">
                          {formatNumber(result.outcome.hitsToDestroy)}
                        </span>
                        {!weapon.placed && result.timeDestroy !== null && (
                          <span className="mt-2 font-mono text-[10px] text-gold/50">
                            {formatSeconds(result.timeDestroy)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Damage per hit */}
                    <div className="flex items-center justify-between rounded border border-cream/8 bg-black/20 px-3 py-2">
                      <span className="font-mono text-[10px] text-cream/40 uppercase tracking-wider">Dano por acerto</span>
                      <span className="font-mono text-xs tabular-nums text-cream/80">
                        {formatNumber(result.perHit)} HP
                        {shelterActive && (
                          <span className="ml-1.5 text-olive/60">(shelter ativo)</span>
                        )}
                        {result.outcome.breachingModifier !== 1 && (
                          <span className="ml-1.5 text-cream/30">
                            ×{result.outcome.breachingModifier} no breach
                          </span>
                        )}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="rounded border border-rust/20 bg-rust/8 px-3 py-2.5 font-mono text-[10px] leading-relaxed text-rust/80">
                    {weapon.label} ({weapon.damageTypeName}){' '}
                    <strong className="text-rust">não causa breach em estruturas</strong> — reduz HP compartilhado mas não
                    destrói peças. Use explosivo ou demolição para dar breach.
                  </p>
                )}
              </div>
            )}

            <p className="font-mono text-[9px] leading-relaxed text-cream/25 border-t border-cream/8 pt-3 tracking-wide">
              {weapon.placed
                ? 'Munição colocada (satchel/tripé) — conta nº de cargas, sem tempo de recarga.'
                : '"Recarga" = tempo por tiro de cada canhão (varia por arma e crew).'}{' '}
              <span className="text-cream/40">T3 molhado</span> = concreto recém-construído (10× dano na janela de 18h);{' '}
              <span className="text-cream/40">T3 seco</span> = curado.
            </p>
          </div>
        </section>

        {/* Right panel — Bunker stats */}
        <aside className="w-full lg:w-[22rem]">
          <ImportedBunkerPanel shelterCount={shelterCount} />
        </aside>
      </div>
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded border border-cream/10 bg-black/30 px-2 py-1">
      <span className="font-mono text-[8px] tracking-widest text-cream/30 uppercase">{label}</span>
      <span className={`font-mono text-xs font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  )
}

export default SiegeCalculator
