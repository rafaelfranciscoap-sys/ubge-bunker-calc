import { useMemo, useState, type ReactNode } from 'react'
import {
  SHELTER_AFFECTED_TYPES,
  WEAPONS,
  BUNKER_COLUMNS,
  type BunkerColumnKey,
  type Weapon,
} from '../data/weapons'
import { damageTypeText } from '../data/damageTypeStyle'
import { integrityClass, shelterBonusPPForWeapon, weaponDestructionRow } from '../engine/bunkerDestruction'
import { useImportedBunkerStore } from '../store/useImportedBunkerStore'
import {
  ChevronIcon,
  HpShieldIcon,
  MaterialCrateIcon,
  TargetCrosshairIcon,
  WeaponIcon,
} from './icons'

function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

// T1/T2/T3 e wet/dry são termos do jogo — mantidos em inglês.
const COLUMN_LABEL: Record<BunkerColumnKey, string> = {
  t1: 'T1',
  t2: 'T2',
  t3_wet: 'T3 wet',
  t3_dry: 'T3 dry',
}

const INTEGRITY_CLASS_LABEL: Record<string, string> = {
  high: 'high integrity',
  medium: 'medium integrity',
  low: 'low integrity',
  critical: 'critical integrity',
}
const INTEGRITY_CLASS_COLOR: Record<string, string> = {
  high: 'text-good',
  medium: 'text-gold',
  low: 'text-danger',
  critical: 'text-critical',
}

function Section({
  title,
  suffix,
  icon,
  children,
}: {
  title: string
  suffix?: string
  icon: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <section className="border-b border-cream/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-cream/4"
      >
        <span className="shrink-0 text-cream/50">{icon}</span>
        <span className="flex-1 font-display text-sm font-semibold tracking-wide text-cream">
          {title}
          {suffix && <span className="ml-1.5 text-xs font-normal text-cream/40">{suffix}</span>}
        </span>
        <ChevronIcon
          className={`shrink-0 text-cream/40 transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </section>
  )
}

function HealthCell({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-cream/6 bg-ink/70 px-1 py-2.5 text-center">
      <span className={`font-display text-lg font-semibold leading-tight ${color}`}>{value}</span>
      <span className="mt-0.5 text-[10px] leading-tight text-cream/50">{label}</span>
    </div>
  )
}

function isShelterAffected(weapon: Weapon, shelterCount: number): boolean {
  return (
    shelterCount > 0 && !weapon.bypassesShelter && SHELTER_AFFECTED_TYPES.has(weapon.damageTypeName)
  )
}

// Painel de estatísticas do bunker IMPORTADO do foxbunker, no espírito do "Selection Stats"
// do foxholeplanner. Alimentado só pelos dados que vieram do import — nada estimado; campos
// ausentes ficam "—".
export function ImportedBunkerPanel({ shelterCount = 0 }: { shelterCount?: number }) {
  const data = useImportedBunkerStore((state) => state.data)
  const clear = useImportedBunkerStore((state) => state.clear)

  const destructionRows = useMemo(() => {
    if (!data || data.hpTotal === null || data.hpTotal <= 0) return null
    return WEAPONS.map((weapon) => ({
      weapon,
      hits: weaponDestructionRow(
        data.hpTotal as number,
        weapon,
        shelterBonusPPForWeapon(weapon, shelterCount),
      ),
      shelterAffected: isShelterAffected(weapon, shelterCount),
      shelterBypassed: shelterCount > 0 && weapon.bypassesShelter,
    }))
  }, [data, shelterCount])

  if (!data) return null

  const integFraction = data.integrityPercent !== null ? data.integrityPercent / 100 : null
  const integClass = integFraction !== null ? integrityClass(integFraction) : null
  const hasCost =
    data.constructionBmat != null ||
    data.constructionConcrete != null ||
    data.constructionDigging != null

  return (
    <section className="overflow-hidden rounded-lg border border-good/40 bg-surface shadow-lg shadow-black/40">
      <div className="flex items-center justify-between gap-2 border-b border-good/20 bg-surface-raised px-3 py-2.5">
        <h2 className="font-display text-sm font-semibold tracking-[0.06em] text-good uppercase">
          Bunker Stats
          <span className="ml-1.5 text-xs font-normal normal-case tracking-normal text-cream/40">
            (imported)
          </span>
        </h2>
        <button
          type="button"
          onClick={clear}
          className="rounded border border-cream/25 px-2 py-0.5 text-xs text-cream/70 transition-colors hover:border-danger/60 hover:text-danger"
        >
          Clear
        </button>
      </div>

      {hasCost && (
        <Section title="Construction Cost" icon={<MaterialCrateIcon />}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              <MaterialCrateIcon className="shrink-0 text-cream/60" />
              <span className="flex-1 text-cream/80">Basic Materials</span>
              <span className="font-semibold text-danger">
                ×{formatNumber(data.constructionBmat ?? null)}
              </span>
            </div>
            {data.constructionConcrete != null && data.constructionConcrete > 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-2 py-1.5 text-sm">
                <MaterialCrateIcon className="shrink-0 text-gold" />
                <span className="flex-1 text-cream">
                  Concrete <span className="text-cream/50">(to upgrade to T3)</span>
                </span>
                <span className="font-semibold text-gold">
                  ×{formatNumber(data.constructionConcrete)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <MaterialCrateIcon className="shrink-0 text-cream/60" />
                <span className="flex-1 text-cream/80">Concrete (for T3)</span>
                <span className="text-cream/40">— (build is not T3)</span>
              </div>
            )}
            {data.constructionDigging != null && data.constructionDigging > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <MaterialCrateIcon className="shrink-0 text-cream/60" />
                <span className="flex-1 text-cream/80">Excavation Materials</span>
                <span className="font-semibold text-danger">
                  ×{formatNumber(data.constructionDigging)}
                </span>
              </div>
            )}
          </div>
        </Section>
      )}

      <Section title="Bunker Health" icon={<HpShieldIcon />}>
        <div className="grid grid-cols-3 gap-1.5">
          <HealthCell value={formatNumber(data.hpTotal)} label="total health" color="text-good" />
          <HealthCell
            value={formatNumber(data.repairBmat ?? data.repairCost)}
            label="repair cost"
            color="text-gold"
          />
          <HealthCell value="—" label="repair rate" color="text-cream/40" />
          <HealthCell
            value={formatNumber(data.breachHpAbsolute)}
            label="breach HP"
            color="text-danger"
          />
          <HealthCell
            value={data.breachPercent !== null ? `${Math.round(data.breachPercent)}%` : '—'}
            label="breach %"
            color="text-danger"
          />
          <HealthCell
            value={integFraction !== null ? `${Math.round(integFraction * 100)}%` : '—'}
            label={integClass ? INTEGRITY_CLASS_LABEL[integClass] : 'integrity'}
            color={integClass ? INTEGRITY_CLASS_COLOR[integClass] : 'text-cream/40'}
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-cream/40">
          "Repair rate" (HP per hammer swing) is not confirmed in the source — left blank rather
          than estimated.
        </p>
      </Section>

      <Section
        title="Bunker Destruction"
        suffix={shelterCount > 0 ? `(${shelterCount}× shelter on target)` : '(shots to destroy)'}
        icon={<TargetCrosshairIcon />}
      >
        {destructionRows ? (
          <>
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-cream/15">
                    <th className="py-1.5 text-left font-display text-[11px] font-medium uppercase tracking-wide text-cream/50">
                      Weapon
                    </th>
                    {BUNKER_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="py-1.5 pl-2 text-right font-display text-[11px] font-medium uppercase tracking-wide text-cream/50"
                      >
                        {COLUMN_LABEL[col.key]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {destructionRows.map(({ weapon, hits, shelterAffected, shelterBypassed }) => (
                    <tr
                      key={weapon.key}
                      className="border-t border-cream/8 transition-colors hover:bg-cream/5"
                    >
                      <td className="py-1.5 pr-2">
                        <span className="flex items-center gap-1.5">
                          {/* Ícone carrega o TIPO DE DANO; o realce de shelter fica no nome,
                              no badge de pp e nos números — as duas informações convivem. */}
                          <WeaponIcon
                            iconType={weapon.iconType}
                            className={`shrink-0 ${damageTypeText(weapon.damageTypeName)}`}
                          />
                          <span className={shelterAffected ? 'text-good/90' : 'text-cream/85'}>
                            {weapon.label}
                          </span>
                          {shelterAffected && (
                            <span className="rounded-sm bg-good/15 px-1 text-[9px] text-good/80">
                              +{Math.round(shelterBonusPPForWeapon(weapon, shelterCount) * 100)}pp
                            </span>
                          )}
                          {shelterBypassed && (
                            <span className="rounded-sm bg-danger/15 px-1 text-[9px] text-danger/80">
                              bypass
                            </span>
                          )}
                        </span>
                      </td>
                      {BUNKER_COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          className={`py-1.5 pl-2 text-right ${shelterAffected ? 'text-good/90' : 'text-cream/90'}`}
                        >
                          {formatNumber(hits[col.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-cream/40">
              <strong className="text-cream/60">T3 wet</strong> = freshly poured concrete (takes 10×
              damage during the curing window); <strong className="text-cream/60">T3 dry</strong> =
              fully cured (24h). Formula and values confirmed against foxholeplanner (open source).
            </p>
          </>
        ) : (
          <p className="text-xs text-danger">No HP imported — table unavailable.</p>
        )}
      </Section>
    </section>
  )
}

export default ImportedBunkerPanel
