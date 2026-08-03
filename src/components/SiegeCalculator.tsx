import { useEffect, useMemo, useState } from 'react'
import { inferTierFromImport } from '../data/decay'
import {
  BUNKER_COLUMNS,
  SHELTER_AFFECTED_TYPES,
  SHELTER_BONUS_BY_COUNT,
  SHELTER_CONFIRMED_UP_TO,
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
import { damageTypeBadge, damageTypeText } from '../data/damageTypeStyle'
import { SavedBunkers } from './SavedBunkers'
import { WeaponComparison } from './WeaponComparison'
import {
  ShelterRoomsGlyph,
  TierBrickIcon,
  TierConcreteIcon,
  TierConcreteWetIcon,
  TierSandbagIcon,
  WeaponIcon,
} from './icons'

// Rótulos das colunas — T1/T2/T3 e wet/dry são termos do jogo, mantidos em inglês.
const COLUMN_LABEL: Record<BunkerColumnKey, string> = {
  t1: 'T1',
  t2: 'T2',
  t3_wet: 'T3 wet',
  t3_dry: 'T3 dry',
}

// Material de cada tier — o que muda entre eles é o quanto de dano passa, então mostrar
// o material ajuda mais que a sigla sozinha.
const COLUMN_ICON: Record<BunkerColumnKey, typeof TierSandbagIcon> = {
  t1: TierSandbagIcon,
  t2: TierBrickIcon,
  t3_wet: TierConcreteWetIcon,
  t3_dry: TierConcreteIcon,
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

// Breaching é um EVENTO DE CHANCE, não uma consequência automática de zerar HP: abaixo do
// Breachable Health cada acerto tem uma chance de brechar, começando em 0% e subindo até 25%
// conforme a vida cai (wiki + declaração de dev). Armas de "always-chance-to-breach" (300mm,
// Demolition Breaching) ficam fixas em 25%. Os rótulos e textos aqui existem para não vender
// certeza determinística onde o jogo rola dado — ver BREACH_CHANCE_NOTE abaixo.
function BreachBadge({ outcome }: { outcome: BreachOutcome }) {
  const style = !outcome.canBreach
    ? {
        text: 'This damage type cannot breach structures',
        cls: 'border-danger/40 bg-danger/10 text-danger',
      }
    : outcome.ignoresThreshold
      ? {
          text: 'Can breach from the first hit · ignores the threshold',
          cls: 'border-good/45 bg-good/10 text-good',
        }
      : {
          text: 'Breaching only becomes possible once HP drops to the threshold',
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
  timeOpenBreach,
  timeDestroy,
}: {
  hitsToOpenBreach: number
  hitsToDestroy: number
  timeOpenBreach: number | null
  timeDestroy: number | null
}) {
  if (!Number.isFinite(hitsToDestroy) || hitsToDestroy <= 0) return null
  const phase1 = Number.isFinite(hitsToOpenBreach) ? hitsToOpenBreach : 0
  const phase2 = hitsToDestroy - phase1
  const pct1 = Math.round((phase1 / hitsToDestroy) * 100)
  // Tempo só da fase 2 = total − tempo até a brecha abrir.
  const timePhase2 =
    timeDestroy !== null && timeOpenBreach !== null ? timeDestroy - timeOpenBreach : null

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
      <div className="flex justify-between gap-3 text-[11px] text-cream/45">
        <span>
          <span className="text-danger/80">Phase 1</span> to threshold · {formatNumber(phase1)}
          {timeOpenBreach !== null && (
            <span className="text-cream/35"> · {formatSeconds(timeOpenBreach)}</span>
          )}
        </span>
        <span className="text-right">
          <span className="text-gold/80">Phase 2</span> in breach · {formatNumber(phase2)}
          {timePhase2 !== null && (
            <span className="text-cream/35"> · {formatSeconds(timePhase2)}</span>
          )}
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

  // Preenche a recarga com o ciclo real da plataforma ao trocar de arma (datamine, Mount Points).
  // O valor continua editável — quem tiver crew melhor ou outra plataforma sobrescreve por cima.
  // Armas sem plataforma clara no datamine (infantaria/carga colocada) mantêm o valor atual.
  useEffect(() => {
    const next = WEAPONS.find((w) => w.key === weaponKey)?.cycleSeconds
    if (next) setReloadSeconds(next)
  }, [weaponKey])

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

  // data.breachHpAbsolute = HP que RESTA quando a brecha se expõe (foxbunker: "breach after Xhp"
  // já convertido para o complemento). A fase 1 precisa da quantidade a REMOVER até lá.
  // Hasteado do useMemo porque o comparador de armas também precisa deste valor.
  const phase1Hp =
    data && data.hpTotal !== null ? Math.max(0, data.hpTotal - (data.breachHpAbsolute ?? 0)) : 0

  const result = useMemo(() => {
    if (!data || data.hpTotal === null) return null
    const perHit = effectiveDamagePerHit(weapon, column, shelterBonusPP)
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
  }, [data, weapon, column, guns, reloadSeconds, shelterBonusPP, phase1Hp])

  if (!data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-wide text-gold">
          Siege Calculator
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-cream/60">
          No bunker loaded. Open the <strong className="text-cream">Import</strong> tab, copy your
          build from foxbunker.com and bring the numbers over to plan the siege here.
        </p>
        {/* Alvos salvos também aqui: numa sessão nova é o único caminho até eles. */}
        <div className="w-full text-left">
          <SavedBunkers />
        </div>
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

      <SavedBunkers current={data} />

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

            {/* Ficha da arma: dá cara à seleção, que antes era só uma linha de texto no select. */}
            <div className="flex items-center gap-3 rounded-md border border-cream/10 bg-ink/60 px-3 py-2.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-cream/15 bg-cream/5">
                <WeaponIcon
                  iconType={weapon.iconType}
                  width={26}
                  height={26}
                  className={damageTypeText(weapon.damageTypeName)}
                />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-display text-base font-semibold leading-none text-cream">
                  {weapon.label}
                </span>
                <span className="truncate text-[11px] text-cream/45">
                  {weapon.placed
                    ? 'Placed charge'
                    : (weapon.platform ?? 'Infantry weapon — no datamine platform')}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${damageTypeBadge(
                  weapon.damageTypeName,
                )}`}
              >
                {weapon.damageTypeName}
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="font-display text-lg font-bold leading-none text-cream">
                  {formatNumber(weapon.damage)}
                </span>
                <span className="text-[10px] text-cream/45">base dmg</span>
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="field-label">Bunker State</span>
              <div className="grid grid-cols-4 gap-1.5">
                {BUNKER_COLUMNS.map((col) => {
                  const TierIcon = COLUMN_ICON[col.key]
                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => setColumn(col.key)}
                      aria-pressed={column === col.key}
                      className={`relative flex flex-col items-center gap-1 rounded-md border px-2 py-2 font-display text-xs font-medium tracking-wide transition-colors ${
                        column === col.key
                          ? 'border-gold bg-gold text-bg-dark'
                          : detectedColumn === col.key
                            ? 'border-gold/40 text-cream/90 hover:border-gold/60'
                            : 'border-cream/20 text-cream/70 hover:border-gold/50 hover:text-cream'
                      }`}
                    >
                      <TierIcon width={17} height={17} />
                      {COLUMN_LABEL[col.key]}
                      {detectedColumn === col.key && column !== col.key && (
                        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-good" />
                      )}
                    </button>
                  )
                })}
              </div>
              {detectedColumn && (
                <p className="text-[11px] text-cream/40">
                  Pre-selected from the detected tier · click to change
                </p>
              )}
            </div>

            {/* Artillery Shelter Rooms — o bônus é POR PEÇA ATINGIDA, não do bunker inteiro
                (datamine: "improves the resistance of ADJACENT bunkers"), e não vem no import,
                que só traz HP/integridade/breach. Por isso o rótulo fala do alvo e o texto
                deixa claro que é entrada manual. */}
            <div className="flex flex-col gap-1.5">
              <span className="field-label">Shelters adjacent to your target</span>
              <div className="grid grid-cols-4 gap-1.5">
                {([0, 1, 2, 3] as const).map((n) => {
                  const estimated = n > SHELTER_CONFIRMED_UP_TO
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setShelterCount(n)}
                      aria-pressed={shelterCount === n}
                      title={
                        estimated
                          ? `${n} shelters: stacking not present in the datamine — estimated value`
                          : undefined
                      }
                      className={`relative flex flex-col items-center gap-1.5 rounded-md border py-2 font-display text-xs font-medium tracking-wide transition-colors ${
                        shelterCount === n
                          ? 'border-good/60 bg-good/18 text-good'
                          : 'border-cream/20 text-cream/60 hover:border-cream/40 hover:text-cream/85'
                      }`}
                    >
                      <ShelterRoomsGlyph filled={n} />
                      <span className="flex items-center gap-0.5">
                        {n === 0 ? 'None' : `${n}×`}
                        {estimated && (
                          <span className="text-[9px] leading-none text-warn/70" aria-hidden="true">
                            ?
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>

              <p className="text-[11px] leading-relaxed text-cream/45">
                Manual input — the imported stats carry no shelter data. Count only the Artillery
                Shelter Rooms <strong className="text-cream/65">next to the piece you will shell</strong>;
                shelters elsewhere in the bunker give it nothing.
              </p>

              {shelterCount > 0 && (
                <p className="text-[11px] leading-relaxed text-cream/45">
                  {shelterActive
                    ? `${COLUMN_LABEL[column]}: ${Math.round(baseProfile * 100)}% → ${Math.round(adjustedProfile * 100)}% damage passes · −${Math.round(SHELTER_BONUS_BY_COUNT[Math.min(shelterCount, SHELTER_BONUS_BY_COUNT.length - 1)] * 100)}pp vs High Explosive`
                    : shelterBypassed
                      ? '300mm bypasses the shelter bonus'
                      : `Does not affect ${weapon.damageTypeName} damage`}
                </p>
              )}

              {shelterCount > SHELTER_CONFIRMED_UP_TO && shelterActive && (
                <p className="rounded-md border border-warn/25 bg-warn/8 px-2.5 py-1.5 text-[11px] leading-relaxed text-warn/90">
                  <strong>Estimated.</strong> The datamine only defines the first shelter
                  (+15pp). How the bonus stacks past that is not in any datamine field — treat{' '}
                  {shelterCount}× as an educated guess, not a confirmed number.
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
                <span className="field-label flex items-center gap-1.5">
                  Reload (s)
                  {weapon.cycleSeconds === reloadSeconds && weapon.platform && (
                    <span className="rounded-sm bg-good/15 px-1 text-[9px] normal-case tracking-normal text-good/80">
                      auto
                    </span>
                  )}
                </span>
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

            {weapon.platform && !weapon.placed && (
              <p className="-mt-2 text-[11px] leading-relaxed text-cream/40">
                Full fire cycle of the{' '}
                <strong className="text-cream/60">{weapon.platform}</strong> from the datamine
                (firing delay + reload). Override it if your crew or platform differs.
              </p>
            )}

            {result && (
              <div className="flex flex-col gap-3 border-t border-cream/10 pt-4">
                <BreachBadge outcome={result.outcome} />

                {result.outcome.canBreach ? (
                  <>
                    {/* Os dois números que decidem o cerco */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative flex flex-col items-center overflow-hidden rounded-lg border border-danger/30 bg-danger/8 px-3 py-4 text-center">
                        {/* Silhueta da arma como marca d'água: dá peso ao bloco sem ocupar espaço. */}
                        <WeaponIcon
                          iconType={weapon.iconType}
                          width={96}
                          height={96}
                          aria-hidden="true"
                          className="pointer-events-none absolute -bottom-5 -right-4 text-danger opacity-[0.07]"
                        />
                        {result.outcome.ignoresThreshold ? (
                          <span className="relative font-display text-2xl font-bold leading-none text-danger">
                            FROM HIT 1
                          </span>
                        ) : (
                          <span className="relative font-display text-[2.75rem] font-bold leading-none text-danger">
                            {formatNumber(result.outcome.hitsToOpenBreach)}
                          </span>
                        )}
                        {/* "to threshold", não "to breach": este número é quando brechar se torna
                            POSSÍVEL, não quando acontece. A brecha em si é rolagem de chance. */}
                        <span className="field-label relative mt-2 !text-[10px] !tracking-[0.1em]">
                          {result.outcome.ignoresThreshold ? 'Can breach' : 'Hits to threshold'}
                        </span>
                        {!weapon.placed && result.timeOpenBreach !== null && (
                          <span className="relative mt-1 text-xs text-cream/45">
                            {formatSeconds(result.timeOpenBreach)}
                          </span>
                        )}
                      </div>
                      <div className="relative flex flex-col items-center overflow-hidden rounded-lg border border-gold/30 bg-gold/8 px-3 py-4 text-center">
                        <WeaponIcon
                          iconType={weapon.iconType}
                          width={96}
                          height={96}
                          aria-hidden="true"
                          className="pointer-events-none absolute -bottom-5 -right-4 text-gold opacity-[0.07]"
                        />
                        <span className="relative font-display text-[2.75rem] font-bold leading-none text-gold">
                          {formatNumber(result.outcome.hitsToDestroy)}
                        </span>
                        <span className="field-label relative mt-2 !text-[10px] !tracking-[0.1em]">
                          Hits of damage
                        </span>
                        {!weapon.placed && result.timeDestroy !== null && (
                          <span className="relative mt-1 text-xs text-cream/45">
                            {formatSeconds(result.timeDestroy)}
                          </span>
                        )}
                      </div>
                    </div>

                    {!result.outcome.ignoresThreshold && (
                      <PhaseBar
                        hitsToOpenBreach={result.outcome.hitsToOpenBreach}
                        hitsToDestroy={result.outcome.hitsToDestroy}
                        timeOpenBreach={result.timeOpenBreach}
                        timeDestroy={result.timeDestroy}
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

                    {/* Sem isto a tela vende certeza determinística onde o jogo rola dado. */}
                    <p className="rounded-md border border-warn/25 bg-warn/8 px-2.5 py-2 text-[11px] leading-relaxed text-warn/90">
                      <strong>Breaching is a dice roll, not a countdown.</strong> Reaching the
                      threshold does not break anything by itself — below it, every hit gets a{' '}
                      <em>chance</em> to breach, starting near 0% and rising toward 25% as HP falls
                      (weapons that ignore the threshold sit at a flat 25%). So read the left number
                      as "when breaching becomes possible" and the right one as total damage
                      throughput — a planning baseline, not a guaranteed shell count.
                    </p>
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

            {data.hpTotal !== null && (
              <WeaponComparison
                maxHealth={data.hpTotal}
                phase1Hp={phase1Hp}
                column={column}
                shelterCount={shelterCount}
                guns={guns}
                selectedWeaponKey={weaponKey}
                onSelectWeapon={setWeaponKey}
              />
            )}

            <p className="text-[11px] leading-relaxed text-cream/40">
              {weapon.placed
                ? 'Placed charge (satchel / tripod) — counts the number of charges, no reload time.'
                : '"Reload" is the time per shot for each gun (varies by weapon and crew).'}{' '}
              <strong className="text-cream/60">T3 wet</strong> = freshly poured concrete (takes 10×
              damage while curing);{' '}
              <strong className="text-cream/60">T3 dry</strong> = fully cured. Concrete cures in{' '}
              <strong className="text-cream/60">18h</strong> — except the Underground Fortress and
              the Storm Cannon, which take 48h.
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
