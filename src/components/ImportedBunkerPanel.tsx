import { useMemo, useState, type ReactNode } from 'react'
import { DECAY_BY_TIER, inferTierFromImport, totalDecayHours } from '../data/decay'
import { SHELTER_AFFECTED_TYPES, WEAPONS, BUNKER_COLUMNS, type BunkerColumnKey, type Weapon } from '../data/weapons'
import { integrityClass, shelterBonusPPForWeapon, weaponDestructionRow } from '../engine/bunkerDestruction'
import { useImportedBunkerStore } from '../store/useImportedBunkerStore'
import { ChevronIcon, MaintenanceCanIcon, MaterialCrateIcon, ShellIcon } from './icons'

function formatHours(hours: number): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(hours)}h`
}

function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value)
}

const COLUMN_LABEL_PT: Record<BunkerColumnKey, string> = {
  t1: 'T1',
  t2: 'T2',
  t3_wet: 'T3 mol.',
  t3_dry: 'T3 seco',
}

const INTEGRITY_CLASS_LABEL_PT: Record<string, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
  critical: 'Crítica',
}
const INTEGRITY_CLASS_COLOR: Record<string, string> = {
  high: 'text-emerald-400',
  medium: 'text-gold',
  low: 'text-rust',
  critical: 'text-red-500',
}
const INTEGRITY_BAR_COLOR: Record<string, string> = {
  high: 'bg-emerald-400',
  medium: 'bg-gold',
  low: 'bg-rust',
  critical: 'bg-red-500',
}

function Section({
  title,
  suffix,
  children,
  defaultOpen = true,
}: {
  title: string
  suffix?: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b border-cream/8 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-black/20 transition-colors"
      >
        <span className="flex-1 font-mono text-[10px] font-bold tracking-[0.15em] text-cream/60 uppercase">
          {title}
          {suffix && <span className="ml-2 font-normal text-cream/25">{suffix}</span>}
        </span>
        <ChevronIcon className={`shrink-0 h-3 w-3 text-cream/25 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </section>
  )
}

function DataRow({ label, value, valueClass = 'text-cream/90', icon }: { label: string; value: ReactNode; valueClass?: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-cream/5 last:border-b-0">
      {icon && <span className="shrink-0 text-cream/30">{icon}</span>}
      <span className="flex-1 font-mono text-[10px] text-cream/40">{label}</span>
      <span className={`font-mono text-xs tabular-nums font-semibold ${valueClass}`}>{value}</span>
    </div>
  )
}

function isShelterAffected(weapon: Weapon, shelterCount: number): boolean {
  return shelterCount > 0 && !weapon.bypassesShelter && SHELTER_AFFECTED_TYPES.has(weapon.damageTypeName)
}

export function ImportedBunkerPanel({ shelterCount = 0 }: { shelterCount?: number }) {
  const data = useImportedBunkerStore((state) => state.data)
  const clear = useImportedBunkerStore((state) => state.clear)

  const destructionRows = useMemo(() => {
    if (!data || data.hpTotal === null || data.hpTotal <= 0) return null
    return WEAPONS.map((weapon) => ({
      weapon,
      hits: weaponDestructionRow(data.hpTotal as number, weapon, shelterBonusPPForWeapon(weapon, shelterCount)),
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

  const inferredTier = inferTierFromImport(data.hpTotal, data.size, data.integrityPercent)
  const decay = inferredTier ? DECAY_BY_TIER[inferredTier] : null
  const repairTotal = data.repairBmat ?? data.repairCost

  return (
    <section className="overflow-hidden rounded border border-olive/30 bg-bg-panel">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-olive/20 bg-black/30 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-olive/60" />
          <h2 className="font-mono text-[10px] font-bold tracking-[0.2em] text-olive/80 uppercase">
            Estatísticas do Bunker
          </h2>
        </div>
        <button
          type="button"
          onClick={clear}
          className="rounded border border-cream/15 px-2 py-0.5 font-mono text-[9px] tracking-wider text-cream/40 uppercase hover:border-rust/40 hover:text-rust/70 transition-colors"
        >
          Limpar
        </button>
      </div>

      {/* HP / Integrity visual bar */}
      {integFraction !== null && integClass && (
        <div className="border-b border-cream/8 px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[9px] tracking-widest text-cream/30 uppercase">Integridade Estrutural</span>
            <span className={`font-mono text-xs font-bold ${INTEGRITY_CLASS_COLOR[integClass]}`}>
              {Math.round(integFraction * 100)}% · {INTEGRITY_CLASS_LABEL_PT[integClass]}
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-black/50 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${INTEGRITY_BAR_COLOR[integClass]}`}
              style={{ width: `${Math.round(integFraction * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* HP quick stats */}
      <div className="grid grid-cols-3 border-b border-cream/8">
        <QuickStat label="HP Total" value={formatNumber(data.hpTotal)} color="text-cream" />
        <QuickStat label="HP Breach" value={formatNumber(data.breachHpAbsolute)} color="text-rust" border />
        <QuickStat label="Breach %" value={data.breachPercent !== null ? `${Math.round(data.breachPercent)}%` : '—'} color="text-rust" border />
      </div>

      {hasCost && (
        <Section title="Custo de Construção">
          <DataRow
            label="Materiais Básicos"
            value={`x${formatNumber(data.constructionBmat ?? null)}`}
            valueClass="text-rust"
            icon={<MaterialCrateIcon className="h-3 w-3" />}
          />
          {data.constructionConcrete != null && data.constructionConcrete > 0 ? (
            <DataRow
              label="Concreto (T3)"
              value={`x${formatNumber(data.constructionConcrete)}`}
              valueClass="text-gold"
              icon={<MaterialCrateIcon className="h-3 w-3" />}
            />
          ) : (
            <DataRow
              label="Concreto (T3)"
              value="— (não T3)"
              valueClass="text-cream/25"
              icon={<MaterialCrateIcon className="h-3 w-3" />}
            />
          )}
          {data.constructionDigging != null && data.constructionDigging > 0 && (
            <DataRow
              label="Escavação"
              value={`x${formatNumber(data.constructionDigging)}`}
              valueClass="text-rust"
              icon={<MaterialCrateIcon className="h-3 w-3" />}
            />
          )}
        </Section>
      )}

      <Section title="Manutenção / Decaimento" suffix={inferredTier ? `(${inferredTier})` : undefined}>
        {decay && inferredTier ? (
          <>
            <DataRow
              label="Começa a decair após"
              value={formatHours(decay.startHours)}
              icon={<MaintenanceCanIcon className="h-3 w-3" />}
            />
            <DataRow
              label="Destruído sem manutenção"
              value={formatHours(totalDecayHours(inferredTier))}
              valueClass="text-rust"
              icon={<MaintenanceCanIcon className="h-3 w-3" />}
            />
            <DataRow
              label="Custo p/ reparar (bmat)"
              value={`${formatNumber(repairTotal)}`}
              valueClass="text-gold"
              icon={<MaterialCrateIcon className="h-3 w-3" />}
            />
            <p className="mt-2 font-mono text-[9px] leading-relaxed text-cream/20 tracking-wide">
              Janela de decaimento: {formatHours(decay.durationHours)}. Valores {inferredTier} (datamine Update 65).
            </p>
          </>
        ) : (
          <p className="font-mono text-[10px] text-cream/30">
            Tier não detectado — decaimento indisponível.
          </p>
        )}
      </Section>

      <Section title="Tiros para Destruir" suffix={shelterCount > 0 ? `(${shelterCount}× shelter)` : undefined}>
        {destructionRows ? (
          <>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pb-1.5 text-left font-mono text-[9px] font-normal tracking-widest text-cream/25 uppercase">Arma</th>
                  {BUNKER_COLUMNS.map((col) => (
                    <th key={col.key} className="pb-1.5 text-right font-mono text-[9px] font-normal tracking-widest text-cream/25 uppercase">
                      {COLUMN_LABEL_PT[col.key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {destructionRows.map(({ weapon, hits, shelterAffected, shelterBypassed }) => (
                  <tr key={weapon.key} className="border-t border-cream/5">
                    <td className="py-1.5 pr-2">
                      <span className="flex items-center gap-1">
                        <ShellIcon className={`shrink-0 h-3 w-3 ${shelterAffected ? 'text-olive/50' : 'text-cream/25'}`} />
                        <span className={`font-mono text-[10px] ${shelterAffected ? 'text-olive/80' : 'text-cream/60'}`}>
                          {weapon.label}
                        </span>
                        {shelterAffected && (
                          <span className="font-mono text-[8px] text-olive/40">+{Math.round(shelterBonusPPForWeapon(weapon, shelterCount) * 100)}pp</span>
                        )}
                        {shelterBypassed && (
                          <span className="font-mono text-[8px] text-rust/40">ignora</span>
                        )}
                      </span>
                    </td>
                    {BUNKER_COLUMNS.map((col) => (
                      <td key={col.key} className={`py-1.5 text-right font-mono text-[10px] tabular-nums font-semibold ${shelterAffected ? 'text-olive/80' : 'text-cream/80'}`}>
                        {formatNumber(hits[col.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 font-mono text-[9px] leading-relaxed text-cream/20 tracking-wide">
              <span className="text-cream/35">T3 molhado</span> = recém-construído (10× dano, 18h);{' '}
              <span className="text-cream/35">T3 seco</span> = curado (24h).
            </p>
          </>
        ) : (
          <p className="font-mono text-[10px] text-rust/60">Sem HP importado — tabela indisponível.</p>
        )}
      </Section>
    </section>
  )
}

function QuickStat({ label, value, color, border }: { label: string; value: string; color: string; border?: boolean }) {
  return (
    <div className={`flex flex-col items-center py-2.5 px-2 ${border ? 'border-l border-cream/8' : ''}`}>
      <span className="font-mono text-[8px] tracking-[0.15em] text-cream/25 uppercase mb-0.5">{label}</span>
      <span className={`font-mono text-sm font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  )
}

export default ImportedBunkerPanel
