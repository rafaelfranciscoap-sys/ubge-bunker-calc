import { useMemo, useState, type ReactNode } from 'react'
import { DECAY_BY_TIER, inferTierFromImport, totalDecayHours } from '../data/decay'
import { SHELTER_AFFECTED_TYPES, WEAPONS, BUNKER_COLUMNS, type BunkerColumnKey, type Weapon } from '../data/weapons'
import { integrityClass, shelterBonusPPForWeapon, weaponDestructionRow } from '../engine/bunkerDestruction'
import { useImportedBunkerStore } from '../store/useImportedBunkerStore'
import { ChevronIcon, MaintenanceCanIcon, MaterialCrateIcon, WeaponIcon } from './icons'

function formatHours(hours: number): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(hours)}h`
}

function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value)
}

// Rótulos das colunas de tier em PT-BR (T1/T2/T3 são termos do jogo; "wet/dry" viram
// "molhado/seco" — estados de cura do concreto).
const COLUMN_LABEL_PT: Record<BunkerColumnKey, string> = {
  t1: 'T1',
  t2: 'T2',
  t3_wet: 'T3 molhado',
  t3_dry: 'T3 seco',
}

const INTEGRITY_CLASS_LABEL_PT: Record<string, string> = {
  high: 'integridade alta',
  medium: 'integridade média',
  low: 'integridade baixa',
  critical: 'integridade crítica',
}
const INTEGRITY_CLASS_COLOR: Record<string, string> = {
  high: 'text-emerald-400',
  medium: 'text-gold',
  low: 'text-rust',
  critical: 'text-red-500',
}

function Section({
  title,
  suffix,
  children,
}: {
  title: string
  suffix?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <section className="border-b border-cream/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <MaterialCrateIcon className="shrink-0 text-cream/50" />
        <span className="flex-1 text-sm font-semibold text-cream">
          {title}
          {suffix && <span className="ml-1 text-xs font-normal text-cream/40">{suffix}</span>}
        </span>
        <ChevronIcon className={`shrink-0 text-cream/40 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </section>
  )
}

function HealthCell({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded bg-black/30 px-1 py-2 text-center">
      <span className={`text-lg font-semibold leading-tight ${color}`}>{value}</span>
      <span className="text-[10px] leading-tight text-cream/50">{label}</span>
    </div>
  )
}

// Painel de estatísticas do bunker IMPORTADO do foxbunker (aba Simulação de Cerco), no layout do
// "Selection Stats" do foxholeplanner. Alimentado só pelos dados que vieram do import — nada
// estimado; campos ausentes na screenshot ficam "—".
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
    <section className="overflow-hidden rounded border border-olive/50 bg-[#171310]">
      <div className="flex items-center justify-between gap-2 bg-black/40 px-3 py-2">
        <h2 className="text-sm font-semibold text-olive">
          Estatísticas do Bunker
          <span className="ml-1 text-xs font-normal text-cream/40">(importado)</span>
        </h2>
        <button
          type="button"
          onClick={clear}
          className="rounded border border-cream/30 px-2 py-0.5 text-xs text-cream/70 hover:border-gold/50"
        >
          Limpar
        </button>
      </div>

      {hasCost && (
        <Section title="Custo de Construção">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              <MaterialCrateIcon className="shrink-0 text-cream/60" />
              <span className="flex-1 text-cream/80">Materiais Básicos</span>
              <span className="font-semibold text-rust">x{formatNumber(data.constructionBmat ?? null)}</span>
            </div>
            {data.constructionConcrete != null && data.constructionConcrete > 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-2 py-1.5 text-sm">
                <MaterialCrateIcon className="shrink-0 text-gold" />
                <span className="flex-1 text-cream">
                  Concreto <span className="text-cream/50">(para upar a T3)</span>
                </span>
                <span className="font-semibold text-gold">x{formatNumber(data.constructionConcrete)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <MaterialCrateIcon className="shrink-0 text-cream/60" />
                <span className="flex-1 text-cream/80">Concreto (para T3)</span>
                <span className="text-cream/40">— (build não é T3)</span>
              </div>
            )}
            {data.constructionDigging != null && data.constructionDigging > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <MaterialCrateIcon className="shrink-0 text-cream/60" />
                <span className="flex-1 text-cream/80">Materiais de Escavação</span>
                <span className="font-semibold text-rust">x{formatNumber(data.constructionDigging)}</span>
              </div>
            )}
          </div>
        </Section>
      )}

      <Section title="Vida do Bunker">
        <div className="grid grid-cols-3 gap-1.5">
          <HealthCell value={formatNumber(data.hpTotal)} label="vida total" color="text-emerald-400" />
          <HealthCell value={formatNumber(data.repairBmat ?? data.repairCost)} label="custo de reparo" color="text-gold" />
          <HealthCell value="—" label="taxa de reparo" color="text-cream/40" />
          <HealthCell value={formatNumber(data.breachHpAbsolute)} label="HP de breach" color="text-rust" />
          <HealthCell
            value={data.breachPercent !== null ? `${Math.round(data.breachPercent)}%` : '—'}
            label="breach %"
            color="text-rust"
          />
          <HealthCell
            value={integFraction !== null ? `${Math.round(integFraction * 100)}%` : '—'}
            label={integClass ? INTEGRITY_CLASS_LABEL_PT[integClass] : 'integridade'}
            color={integClass ? INTEGRITY_CLASS_COLOR[integClass] : 'text-cream/40'}
          />
        </div>
        <p className="mt-2 text-[10px] text-cream/40">
          "taxa de reparo" (hp por martelada) ainda não confirmado na fonte — mantido em branco em
          vez de estimado.
        </p>
      </Section>

      <Section title="Manutenção / Decaimento" suffix={inferredTier ? `(${inferredTier})` : undefined}>
        {decay && inferredTier ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              <MaintenanceCanIcon className="shrink-0 text-cream/60" />
              <span className="flex-1 text-cream/80">Começa a decair após</span>
              <span className="font-semibold text-cream tabular-nums">{formatHours(decay.startHours)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MaintenanceCanIcon className="shrink-0 text-cream/60" />
              <span className="flex-1 text-cream/80">Destruído sem manutenção em</span>
              <span className="font-semibold text-rust tabular-nums">
                {formatHours(totalDecayHours(inferredTier))}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MaterialCrateIcon className="shrink-0 text-cream/60" />
              <span className="flex-1 text-cream/80">Custo p/ reparar (manter)</span>
              <span className="font-semibold text-gold tabular-nums">{formatNumber(repairTotal)} bmat</span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-cream/40">
              Manter = reparar (martelo) antes de decair, zerando o cronômetro. Janela de decaimento:{' '}
              {formatHours(decay.durationHours)}. Valores da peça-padrão {inferredTier} (datamine
              Update 65) — Bunker Base e estruturas grandes decaem mais devagar. O consumo de
              Maintenance Supplies (túnel) não está no datamine, então não é estimado aqui.
            </p>
          </div>
        ) : (
          <p className="text-xs text-cream/50">
            Não foi possível inferir o tier do bunker importado — decaimento indisponível.
          </p>
        )}
      </Section>

      <Section title="Destruição do Bunker" suffix={shelterCount > 0 ? `(${shelterCount}× Artillery Shelter)` : '(tiros p/ destruir)'}>
        {destructionRows ? (
          <>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-cream/50">
                  <th className="py-1 text-left font-normal">Arma</th>
                  {BUNKER_COLUMNS.map((col) => (
                    <th key={col.key} className="py-1 text-right font-normal">
                      {COLUMN_LABEL_PT[col.key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {destructionRows.map(({ weapon, hits, shelterAffected, shelterBypassed }) => (
                  <tr key={weapon.key} className="border-t border-cream/10">
                    <td className="py-1 pr-2">
                      <span className="flex items-center gap-1.5">
                        <WeaponIcon iconType={weapon.iconType} className={`shrink-0 ${shelterAffected ? 'text-olive/70' : 'text-cream/50'}`} />
                        <span className={shelterAffected ? 'text-olive/90' : undefined}>
                          {weapon.label}
                        </span>
                        {shelterAffected && (
                          <span className="text-[9px] text-olive/60">+{Math.round(shelterBonusPPForWeapon(weapon, shelterCount) * 100)}pp</span>
                        )}
                        {shelterBypassed && (
                          <span className="text-[9px] text-rust/60">ignora</span>
                        )}
                      </span>
                    </td>
                    {BUNKER_COLUMNS.map((col) => (
                      <td key={col.key} className={`py-1 text-right tabular-nums ${shelterAffected ? 'text-olive/90' : 'text-cream/90'}`}>
                        {formatNumber(hits[col.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[10px] text-cream/40">
              <strong className="text-cream/60">T3 molhado</strong> = concreto recém-construído (toma
              10× dano na janela de cura); <strong className="text-cream/60">T3 seco</strong> = curado
              (24h). Fórmula e valores confirmados do foxholeplanner (open source).
            </p>
          </>
        ) : (
          <p className="text-xs text-rust">Sem HP importado — tabela indisponível.</p>
        )}
      </Section>
    </section>
  )
}

export default ImportedBunkerPanel
