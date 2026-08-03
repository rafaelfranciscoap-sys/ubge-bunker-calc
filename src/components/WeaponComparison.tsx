import { useMemo, useState } from 'react'
import { damageTypeText } from '../data/damageTypeStyle'
import { WEAPONS, type BunkerColumnKey } from '../data/weapons'
import {
  breachOutcome,
  effectiveDamagePerHit,
  shelterBonusPPForWeapon,
} from '../engine/bunkerDestruction'
import { ChevronIcon, WeaponIcon } from './icons'

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

function formatSeconds(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  return `${minutes}m ${(total % 60).toString().padStart(2, '0')}s`
}

export interface WeaponComparisonProps {
  maxHealth: number
  /** HP a remover antes da brecha abrir (= SI × maxHP). */
  phase1Hp: number
  column: BunkerColumnKey
  shelterCount: number
  guns: number
  selectedWeaponKey: string
  onSelectWeapon: (key: string) => void
}

// Inverte a pergunta do painel principal: em vez de "quantos tiros com ESTA arma?", responde
// "de tudo que existe, o que derruba este bunker mais rápido?" — que é a decisão real antes
// de montar um cerco. Ordena por acertos até destruir; armas que não brecham vão para o fim.
export function WeaponComparison({
  maxHealth,
  phase1Hp,
  column,
  shelterCount,
  guns,
  selectedWeaponKey,
  onSelectWeapon,
}: WeaponComparisonProps) {
  const [open, setOpen] = useState(false)

  const rows = useMemo(() => {
    return WEAPONS.map((weapon) => {
      const shelterBonusPP = shelterBonusPPForWeapon(weapon, shelterCount)
      const perHit = effectiveDamagePerHit(weapon, column, shelterBonusPP)
      const outcome = breachOutcome(maxHealth, phase1Hp, weapon, column, shelterBonusPP)
      // Só estima tempo quando o datamine deu um ciclo de plataforma. Munição colocada
      // (satchel) não tem cadência de tiro — conta cargas, não tempo.
      const cycle = weapon.cycleSeconds
      const timeToDestroy =
        !weapon.placed && cycle && guns > 0 && Number.isFinite(outcome.hitsToDestroy)
          ? (outcome.hitsToDestroy * cycle) / guns
          : null
      return { weapon, perHit, outcome, timeToDestroy }
    }).sort((a, b) => {
      // Quem não brecha nunca destrói: vai para o fim, independente do dano.
      if (a.outcome.canBreach !== b.outcome.canBreach) return a.outcome.canBreach ? -1 : 1
      return a.outcome.hitsToDestroy - b.outcome.hitsToDestroy
    })
  }, [maxHealth, phase1Hp, column, shelterCount, guns])

  const best = rows.find((r) => r.outcome.canBreach && Number.isFinite(r.outcome.hitsToDestroy))

  return (
    <section className="overflow-hidden rounded-lg border border-cream/12 bg-ink/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-cream/4"
      >
        <span className="flex-1 font-display text-sm font-semibold tracking-wide text-cream">
          Weapon Comparison
          <span className="ml-1.5 text-xs font-normal text-cream/40">
            {/* "fewest hits", não "fastest": a ordenação é por acertos, e para carga colocada
              isso é número de cargas, não tempo. */}
          {best ? `(fewest hits: ${best.weapon.label})` : '(all weapons vs this bunker)'}
          </span>
        </span>
        <ChevronIcon
          className={`shrink-0 text-cream/40 transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>

      {open && (
        <div className="px-3 pb-3">
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-cream/15 font-display text-[11px] uppercase tracking-wide text-cream/50">
                  <th className="py-1.5 text-left font-medium">Weapon</th>
                  <th className="py-1.5 pl-2 text-right font-medium">Dmg/hit</th>
                  <th className="py-1.5 pl-2 text-right font-medium">Breach</th>
                  <th className="py-1.5 pl-2 text-right font-medium">Destroy</th>
                  <th className="py-1.5 pl-2 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ weapon, perHit, outcome, timeToDestroy }) => {
                  const selected = weapon.key === selectedWeaponKey
                  return (
                    <tr
                      key={weapon.key}
                      onClick={() => onSelectWeapon(weapon.key)}
                      className={`cursor-pointer border-t border-cream/8 transition-colors ${
                        selected ? 'bg-gold/12' : 'hover:bg-cream/5'
                      } ${outcome.canBreach ? '' : 'opacity-45'}`}
                    >
                      <td className="py-1.5 pr-2">
                        <span className="flex items-center gap-1.5">
                          <WeaponIcon
                            iconType={weapon.iconType}
                            className={`shrink-0 ${damageTypeText(weapon.damageTypeName)}`}
                          />
                          <span className={selected ? 'font-semibold text-gold' : 'text-cream/85'}>
                            {weapon.label}
                          </span>
                        </span>
                      </td>
                      <td className="py-1.5 pl-2 text-right text-cream/70">
                        {formatNumber(perHit)}
                      </td>
                      <td className="py-1.5 pl-2 text-right text-danger/85">
                        {!outcome.canBreach
                          ? '—'
                          : outcome.ignoresThreshold
                            ? 'instant'
                            : formatNumber(outcome.hitsToOpenBreach)}
                      </td>
                      <td className="py-1.5 pl-2 text-right font-semibold text-gold/90">
                        {outcome.canBreach ? formatNumber(outcome.hitsToDestroy) : '—'}
                      </td>
                      <td className="py-1.5 pl-2 text-right text-cream/60">
                        {weapon.placed ? 'placed' : formatSeconds(timeToDestroy)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-cream/40">
            Click a row to load that weapon into the planner. "Time" assumes {guns}{' '}
            {guns === 1 ? 'gun' : 'guns'} firing at the platform's datamine cycle — blank where the
            datamine gives no clear siege platform (infantry weapons). Faded rows cannot breach.
          </p>
        </div>
      )}
    </section>
  )
}

export default WeaponComparison
