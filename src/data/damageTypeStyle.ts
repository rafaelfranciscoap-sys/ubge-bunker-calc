// Cor por TIPO DE DANO — uma leitura só, repetida em todo o app (ficha da arma, tabela de
// destruição, comparador). A ideia é reconhecer a natureza da arma pela cor antes de ler o texto:
//   dourado  = explosivo / alto explosivo (o grosso da artilharia de cerco)
//   verde    = demolição (brecha imediata / modificador alto)
//   vermelho = incendiário
//   apagado  = perfurante, que NÃO brecha estrutura nenhuma
//
// Fica separado de weapons.ts de propósito: aquele arquivo é dado do jogo (datamine), este é
// decisão de apresentação.

const TEXT: Record<string, string> = {
  'High Explosive': 'text-gold',
  Explosive: 'text-gold/75',
  Demolition: 'text-good',
  Incendiary: 'text-danger',
  'Armour Piercing': 'text-cream/40',
}

const BADGE: Record<string, string> = {
  'High Explosive': 'border-gold/40 bg-gold/12 text-gold',
  Explosive: 'border-gold/30 bg-gold/8 text-gold/85',
  Demolition: 'border-good/45 bg-good/12 text-good',
  Incendiary: 'border-danger/40 bg-danger/12 text-danger',
  'Armour Piercing': 'border-cream/25 bg-cream/8 text-cream/65',
}

export function damageTypeText(damageTypeName: string): string {
  return TEXT[damageTypeName] ?? 'text-cream/50'
}

export function damageTypeBadge(damageTypeName: string): string {
  return BADGE[damageTypeName] ?? 'border-cream/25 bg-cream/8 text-cream/60'
}
