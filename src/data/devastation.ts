// Devastation (a wiki indexa como "No Man's Land"; a comunidade chama de "scorched earth").
//
// O terreno acumula devastação conforme é bombardeado, e estrutura construída em cima fica mais
// frágil. É o único modificador do jogo que trabalha A FAVOR do atacante — e por isso a
// ferramenta, ao ignorá-lo, sempre superestimou quantos tiros um cerco precisa.
//
// CONFIRMADO (wiki oficial, No Man's Land / Structure Health):
//   - no máximo, estrutura recebe +50% de dano (×1.5);
//   - no máximo, a chance MÁXIMA de brecha também é multiplicada por 1.5;
//   - estrutura em terreno devastado é "notavelmente mais fácil de incendiar" (sem número);
//   - os dois multiplicadores eram ×2 e foram reduzidos para ×1.5 no Update 1.64;
//   - a progressão visual tem quatro estágios: marrom claro, marrom escuro, cinza, cinza escuro.
//
// NÃO CONFIRMADO em nenhuma fonte que encontrei:
//   - o multiplicador de cada estágio intermediário (só o teto de ×1.5 é publicado);
//   - a escala absoluta, isto é, quantos tiros levam de intacto até o máximo;
//   - se a devastação decai com o tempo;
//   - o multiplicador de incêndio.
// Os estágios do meio abaixo são interpolação linear entre 1.0 e 1.5, marcados como estimados
// para a UI sinalizar — mesmo tratamento dado ao 2º/3º Artillery Shelter.

export interface DevastationStage {
  key: string
  /** Rótulo pela aparência do chão, que é o que o jogador consegue julgar em campo. */
  label: string
  /** Multiplicador do dano recebido pela estrutura. */
  damageMultiplier: number
  /** true = interpolado, sem fonte primária. */
  estimated?: boolean
}

export const DEVASTATION_STAGES: DevastationStage[] = [
  { key: 'pristine', label: 'Pristine', damageMultiplier: 1 },
  { key: 'light', label: 'Light brown', damageMultiplier: 1.125, estimated: true },
  { key: 'dark', label: 'Dark brown', damageMultiplier: 1.25, estimated: true },
  { key: 'grey', label: 'Grey', damageMultiplier: 1.375, estimated: true },
  { key: 'darkgrey', label: 'Dark grey', damageMultiplier: 1.5 },
]

/** Teto confirmado na wiki, tanto para dano recebido quanto para chance máxima de brecha. */
export const DEVASTATION_MAX_MULTIPLIER = 1.5

/**
 * Quanto cada munição adiciona de devastação por tiro.
 * fonte: datamine Update 65, aba "Ammo", coluna "Environment Impact Amount". Só estas quatro
 * têm valor — o resto do arsenal não devasta terreno. (O A0E-9 também devasta, mas é estrutura
 * shippable e não munição, então não aparece nessa aba.)
 *
 * A escala que converte esses pontos em estágio visual não é pública, então isto serve para
 * comparar armas entre si, não para prever o estágio: 150mm e Raidbreaker devastam 3× mais por
 * tiro que 120mm e 300mm.
 */
export const ENVIRONMENT_IMPACT_BY_WEAPON: Record<string, number> = {
  '150mm': 3,
  raidbreaker: 3,
  '120mm': 1,
  '300mm': 1,
}

export function devastationStage(key: string): DevastationStage {
  return DEVASTATION_STAGES.find((s) => s.key === key) ?? DEVASTATION_STAGES[0]
}
