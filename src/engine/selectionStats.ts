// Selection Stats (módulo inspirado no "Selection Stats" do foxholeplanner.com).
//
// PEGADINHA DO JOGO REAL (mesma do siegeCalculator.ts): Structural Integrity e
// Breachable % são propriedades da ILHA inteira, não da seleção. O HP "da seleção"
// é a fatia que as peças selecionadas contribuem ao Max Health da ilha:
//   Max Health (ilha) = Σ rawHp (ilha) × SI(ilha)
//   HP (seleção)      = Σ rawHp (seleção) × SI(ilha)
// Nunca recalculamos SI de um subgrafo da seleção — isso inventaria uma mecânica.

export interface SelectionHealthStats {
  selectionRawHp: number
  /** Fatia da seleção no Max Health da ilha (Σ rawHp selecionado × SI da ilha). */
  selectionMaxHealth: number
  /** Fatia da seleção no Breachable Health, usando o BH% da ilha. */
  selectionBreachableHealth: number
  /** SI da ilha inteira — compartilhada por todas as peças, exibida como "integridade". */
  islandStructuralIntegrity: number
}

export function computeSelectionHealth(
  selectedRawHpValues: number[],
  islandStructuralIntegrity: number,
  islandBreachableHealthPercent: number,
): SelectionHealthStats {
  const selectionRawHp = selectedRawHpValues.reduce((acc, hp) => acc + hp, 0)
  const selectionMaxHealth = selectionRawHp * islandStructuralIntegrity
  return {
    selectionRawHp,
    selectionMaxHealth,
    selectionBreachableHealth: selectionMaxHealth * (islandBreachableHealthPercent / 100),
    islandStructuralIntegrity,
  }
}

// Hits para destruir a seleção: mesmo modelo de dano do siegeCalculator.ts
// (dano efetivo = HE × (1 - resistência)), aplicado ao HP da seleção.
export function computeHitsToDestroy(
  selectionMaxHealth: number,
  heDamage: number,
  explosiveResistance: number,
): number {
  const effectiveDamage = heDamage * (1 - explosiveResistance)
  if (effectiveDamage <= 0 || selectionMaxHealth <= 0) return Infinity
  return Math.ceil(selectionMaxHealth / effectiveDamage)
}
