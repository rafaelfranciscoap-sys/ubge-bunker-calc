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
    ? { text: 'AP não causa breach', cls: 'border-rust/40 bg-rust/10 text-rust' }
    : outcome.ignoresThreshold
      ? { text: 'Breach imediato · ignora o threshold', cls: 'border-olive/50 bg-olive/10 text-olive' }
      : { text: 'Breach só após HP do bunker atingir o threshold', cls: 'border-gold/40 bg-gold/10 text-gold' }
  return (
    <div className={`rounded-md border px-3 py-1.5 text-xs font-medium ${style.cls}`}>{style.text}</div>
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

  // Para exibir a redução efetiva no tier selecionado
  const currentColDef = BUNKER_COLUMNS.find(c => c.key === column)
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
        <h1 className="text-xl font-semibold text-gold">Simulação de Cerco</h1>
        <p className="max-w-md text-sm text-cream/60">
          Nenhum bunker carregado. Vá até a aba{' '}
          <strong className="text-cream">Importar</strong>, copie a build do foxbunker.com e traga
          os dados para simular o cerco aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold text-gold">Simulação de Cerco</h1>
        <p className="text-sm text-cream/50">
          Bunker importado do foxbunker — modificações já embutidas nos números.
        </p>
      </header>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Painel esquerdo */}
        <section className="flex-1 overflow-hidden rounded-lg border border-gold/25 bg-[#171310]">
          <div className="bg-black/40 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-gold">Planejamento de ataque</h2>
          </div>

          {/* Barra de contexto do bunker importado */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gold/15 bg-gold/5 px-4 py-2">
            <span className="text-xs text-cream/70">
              <span className="font-semibold text-cream">{formatNumber(data.hpTotal)}</span> HP
            </span>
            <span className="text-cream/30 text-xs">·</span>
            <span className="text-xs text-cream/70">
              <span className="font-semibold text-cream">
                {data.integrityPercent !== null ? `${Math.round(data.integrityPercent)}%` : '—'}
              </span>{' '}
              integ
            </span>
            <span className="text-cream/30 text-xs">·</span>
            <span className="text-xs text-cream/70">
              <span className="font-semibold text-rust">
                {data.breachPercent !== null ? `${Math.round(data.breachPercent)}%` : '—'}
              </span>{' '}
              breach
            </span>
            {inferredTier && (
              <span className="ml-auto rounded-full border border-olive/40 bg-olive/15 px-2.5 py-0.5 text-[10px] font-medium text-olive">
                {inferredTier} detectado
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4 p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-cream/50">Arma</span>
              <select
                value={weaponKey}
                onChange={(e) => setWeaponKey(e.target.value)}
                className="rounded-md border border-cream/20 bg-black/40 px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
              >
                {WEAPONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label} · {opt.damage} {opt.damageTypeName}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-cream/50">
                Estado do bunker
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {BUNKER_COLUMNS.map((col) => (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => setColumn(col.key)}
                    className={`relative rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                      column === col.key
                        ? 'border-gold bg-gold text-bg-dark'
                        : detectedColumn === col.key
                          ? 'border-gold/40 text-cream/90 hover:border-gold/60'
                          : 'border-cream/20 text-cream/70 hover:border-gold/50'
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
                <p className="text-[10px] text-cream/40">
                  Pré-selecionado pelo tier detectado · clique para mudar
                </p>
              )}
            </div>

            {/* Seletor: Artillery Shelter Rooms */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-cream/50">
                Artillery Shelter Rooms
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {([0, 1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setShelterCount(n)}
                    className={`rounded-md border py-2 text-xs font-medium transition-colors ${
                      shelterCount === n
                        ? 'border-olive/60 bg-olive/20 text-olive'
                        : 'border-cream/20 text-cream/60 hover:border-cream/40'
                    }`}
                  >
                    {n === 0 ? 'Nenhum' : `${n}×`}
                  </button>
                ))}
              </div>
              {shelterCount > 0 && (
                <p className="text-[10px] text-cream/40">
                  {shelterActive
                    ? `${COLUMN_LABEL_PT[column]}: passa ${Math.round(baseProfile * 100)}%→${Math.round(adjustedProfile * 100)}% · −${Math.round(SHELTER_BONUS_BY_COUNT[Math.min(shelterCount, SHELTER_BONUS_BY_COUNT.length - 1)] * 100)}pp de resistência HE`
                    : shelterBypassed
                      ? '300mm ignora o shelter bonus'
                      : `não afeta ${weapon.damageTypeName}`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-cream/50">
                  Canhões
                </span>
                <input
                  type="number"
                  min={1}
                  value={guns}
                  onChange={(e) => setGuns(Math.max(1, Number(e.target.value)))}
                  className="rounded-md border border-cream/20 bg-black/40 px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-cream/50">
                  Recarga (s)
                </span>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={reloadSeconds}
                  onChange={(e) => setReloadSeconds(Math.max(0.1, Number(e.target.value)))}
                  className="rounded-md border border-cream/20 bg-black/40 px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
                />
              </label>
            </div>

            {result && (
              <div className="flex flex-col gap-3 border-t border-cream/10 pt-4">
                <BreachBadge outcome={result.outcome} />

                {result.outcome.canBreach ? (
                  <>
                    {/* Hero cards: os dois números mais importantes */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col items-center rounded-lg border border-rust/30 bg-rust/10 px-3 py-4 text-center">
                        {result.outcome.ignoresThreshold ? (
                          <span className="text-xl font-bold leading-none text-rust">imediato</span>
                        ) : (
                          <span className="text-4xl font-bold leading-none tabular-nums text-rust">
                            {formatNumber(result.outcome.hitsToOpenBreach)}
                          </span>
                        )}
                        <span className="mt-2 text-[10px] uppercase tracking-wide text-cream/50">
                          {result.outcome.ignoresThreshold ? 'breach imediato' : 'hits p/ breach'}
                        </span>
                        {!weapon.placed && result.timeOpenBreach !== null && (
                          <span className="mt-1 text-xs text-cream/40">
                            {formatSeconds(result.timeOpenBreach)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-center rounded-lg border border-gold/25 bg-gold/10 px-3 py-4 text-center">
                        <span className="text-4xl font-bold leading-none tabular-nums text-gold">
                          {formatNumber(result.outcome.hitsToDestroy)}
                        </span>
                        <span className="mt-2 text-[10px] uppercase tracking-wide text-cream/50">
                          hits p/ destruir
                        </span>
                        {!weapon.placed && result.timeDestroy !== null && (
                          <span className="mt-1 text-xs text-cream/40">
                            {formatSeconds(result.timeDestroy)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info secundária */}
                    <div className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2">
                      <span className="text-xs text-cream/60">Dano por acerto</span>
                      <span className="text-xs tabular-nums text-cream">
                        {formatNumber(result.perHit)} HP
                        {shelterActive && (
                          <span className="ml-1 text-olive/70">(shelter ativo)</span>
                        )}
                        {result.outcome.breachingModifier !== 1 && (
                          <span className="ml-1 text-cream/50">
                            (×{result.outcome.breachingModifier} no breach)
                          </span>
                        )}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="rounded-md bg-rust/10 px-3 py-2 text-xs text-rust">
                    {weapon.label} ({weapon.damageTypeName}){' '}
                    <strong>não causa breach em estruturas</strong> — reduz HP compartilhado mas não
                    destrói peças. Use explosivo ou demolição para dar breach.
                  </p>
                )}
              </div>
            )}

            <p className="text-[10px] leading-relaxed text-cream/40">
              {weapon.placed
                ? 'Munição colocada (satchel/tripé) — conta o nº de cargas, sem tempo de recarga.'
                : '"Recarga" é o tempo por tiro de cada canhão (varia por arma e crew).'}{' '}
              <strong className="text-cream/60">T3 molhado</strong> = concreto recém-construído (10×
              dano na janela de cura de 18h);{' '}
              <strong className="text-cream/60">T3 seco</strong> = curado.
            </p>
          </div>
        </section>

        {/* Painel direito: estatísticas do bunker */}
        <aside className="w-full lg:w-96">
          <ImportedBunkerPanel shelterCount={shelterCount} />
        </aside>
      </div>
    </div>
  )
}

export default SiegeCalculator
