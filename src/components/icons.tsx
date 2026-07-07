// Ícones de linha simples (não são cópia dos ícones do foxbunker.com — só cobrem o mesmo
// papel semântico: HP, breach, integridade, custo de reparo, material, tamanho) para o
// card de estatísticas compacto (aproximação visual pedida pelo usuário).
import type { SVGProps } from 'react'

function IconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  )
}

export function HpShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M8 1.2 L13.5 3.2 V7.8 C13.5 11.4 11.2 13.8 8 14.8 C4.8 13.8 2.5 11.4 2.5 7.8 V3.2 Z" />
    </IconBase>
  )
}

export function BreachBurstIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M8 1 L9.4 5.4 L13.5 3.2 L11 6.9 L15 8 L11 9.1 L13.5 12.8 L9.4 10.6 L8 15 L6.6 10.6 L2.5 12.8 L5 9.1 L1 8 L5 6.9 L2.5 3.2 L6.6 5.4 Z" />
    </IconBase>
  )
}

export function IntegrityBarsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="2" y="9.5" width="2.8" height="4.5" />
      <rect x="6.6" y="6" width="2.8" height="8" />
      <rect x="11.2" y="2.2" width="2.8" height="11.8" />
    </IconBase>
  )
}

export function RepairWrenchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M10.8 2.2 A3.1 3.1 0 1 0 13.8 6 L15 7.2 L13 9.2 L11.8 8 A3.1 3.1 0 0 0 10.8 2.2 Z" />
      <path d="M6 10 L2 14" />
    </IconBase>
  )
}

export function MaterialCrateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="1.5" y="4.5" width="13" height="9.5" />
      <path d="M1.5 4.5 L8 1.2 L14.5 4.5" />
      <path d="M8 4.5 V14" />
    </IconBase>
  )
}

export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5 V8 L10.5 9.8" />
    </IconBase>
  )
}

export function TargetCrosshairIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="8" r="6.2" />
      <circle cx="8" cy="8" r="2.4" />
      <path d="M8 0.8 V3.2 M8 12.8 V15.2 M0.8 8 H3.2 M12.8 8 H15.2" />
    </IconBase>
  )
}

export function ChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 6 L8 10 L12 6" />
    </IconBase>
  )
}

// ── Ícones de arma para a tabela de destruição ────────────────────────────────
// Cada forma é distinta o suficiente para ser reconhecível a 14px.

// Artilharia (obuses, morteiros, 120/150/300mm, Raidbreaker) — ogiva alongada.
export function ShellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M8 1.5 C10 3 10.5 5 10.5 7 V12 H5.5 V7 C5.5 5 6 3 8 1.5 Z" />
      <path d="M5.5 12 H10.5 V14 H5.5 Z" />
    </IconBase>
  )
}

// Granada / lançador HE — corpo redondo com alavanca e pino.
export function GrenadeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="9.5" r="4.5" />
      <path d="M6 5.2 H10 V7 H6 Z" />
      <path d="M9.8 5.5 L12 3.5" />
      <circle cx="12.4" cy="3.2" r="0.8" />
    </IconBase>
  )
}

// Munição de tanque / veículo (30mm, 40mm, 75mm, RPG) — projétil cilíndrico curto.
export function RoundIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M6 5.5 Q8 2.5 10 5.5 V12 H6 Z" />
      <path d="M6 12 H10 V13.5 H6 Z" />
    </IconBase>
  )
}

// Armour Piercing (68mm, 94.5mm) — dardo longo e pontiagudo.
export function ApShellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M8 1 L10 4.5 V13.5 H6 V4.5 Z" />
      <path d="M5.5 13.5 H10.5 V15 H5.5 Z" />
    </IconBase>
  )
}

// Foguete / míssil (Rocket, Fire Rocket, Hydra's, Shatter Missile) — corpo com aletas.
export function RocketIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      {/* corpo */}
      <path d="M6.5 3.5 Q8 1 9.5 3.5 V10.5 H6.5 Z" />
      {/* aletas */}
      <path d="M6.5 10.5 L4.5 13 V10.5 Z" />
      <path d="M9.5 10.5 L11.5 13 V10.5 Z" />
      {/* fogo */}
      <path d="M7.2 10.5 Q8 12.5 8.8 10.5" strokeDasharray="0" />
    </IconBase>
  )
}

// Carga de demolição / satchel (Alligator, Havoc, 250mm) — bloco com fuse.
export function SatchelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5.5" width="10" height="7" rx="1.2" />
      <path d="M13 7 Q15 5 13.5 3" />
      <circle cx="13.2" cy="2.6" r="0.9" />
      <path d="M5.5 5.5 V4 M10.5 5.5 V4" />
    </IconBase>
  )
}

import type { WeaponIconType } from '../data/weapons'

// Componente unificado: renderiza o ícone correto pelo iconType da arma.
export function WeaponIcon({ iconType, ...props }: { iconType: WeaponIconType } & SVGProps<SVGSVGElement>) {
  switch (iconType) {
    case 'grenade': return <GrenadeIcon {...props} />
    case 'round':   return <RoundIcon {...props} />
    case 'ap':      return <ApShellIcon {...props} />
    case 'rocket':  return <RocketIcon {...props} />
    case 'satchel': return <SatchelIcon {...props} />
    case 'arty':
    default:        return <ShellIcon {...props} />
  }
}

// Galão de suprimentos de manutenção.
export function MaintenanceCanIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4.5" width="9" height="9.5" rx="1" />
      <path d="M5 4.5 V3 H10 V4.5" />
      <path d="M12 6.5 H14 V10 H12" />
    </IconBase>
  )
}
