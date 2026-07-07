// Substitui as tabelas antigas (Modelo A "per-piece integrity" e Modelo B "edge/dot
// integrity" com modificadores de Johnny Guitar v6) — ver docs/integrity-discrepancy.md
// para o histórico da divergência. Aqueles modificadores eram, na prática, o mesmo hint
// de card isolado listado aqui em `isolatedModifierHint`, que os testes em par abaixo
// provaram NÃO ser o modificador de aresta real. Esta tabela (T3) é a fonte atual.
//
// fonte: observação direta do usuário via foxholeplanner/foxbunker, cross-referenciada
// por custo de material único por peça (conc/bmat/dig)

export type PieceIdentificationConfidence = 'high' | 'medium'

export interface PieceCost {
  concrete: number
  buildingMaterials: number
  diggingMaterials: number
}

export interface PieceT3Data {
  name: string
  rawHp: number
  /**
   * Hint de modificador do card isolado (size 1). Apenas referência para identificação
   * da peça — NUNCA usar na engine de cálculo de Structural Integrity. Testes em par
   * confirmaram que esse valor diverge do modificador de aresta real, ex.:
   * Bunker liso 97% (hint) vs 94.1% (real); Rifle Garrison 86% vs 74.0%;
   * Artillery Shelter Room 90% vs 67.2%.
   */
  isolatedModifierHint: number
  cost: PieceCost
  /** Modificador de aresta real, confirmado por teste em par. `null` = ainda não confirmado. */
  confirmedEdgeModifier: number | null
  /**
   * Confiança da identificação nome↔ícone. 'high' = confirmado por múltiplas fontes
   * convergentes. 'medium' = inferido por formato de ícone + assinatura de custo, não
   * certificado símbolo a símbolo.
   */
  identificationConfidence: PieceIdentificationConfidence
}

export function findPieceDataByName(name: string): PieceT3Data | undefined {
  return PIECES_T3.find((piece) => piece.name === name)
}

export type PieceShape = 'square' | 'triangle'

export interface ToolbarPieceOption {
  key: string
  label: string
  shape: PieceShape
  /** Referencia PieceT3Data.name para lookup de HP/custo/modificador. */
  dataName: string
}

// TODO: confirmar na wiki — formato real (quadrado = 4 arestas / triângulo = 3 arestas)
// de cada peça não foi confirmado na fonte. "Canto" foi assumido como triângulo por
// inferência do nome (peça de canto corta um lado do quadrado); as demais como
// quadrado por padrão. "Bunker liso", "Rampa" e "Canto" compartilham os mesmos
// dados de HP/modificador/custo (mesma linha na tabela), variando só a forma/uso.
export const TOOLBAR_PIECES: ToolbarPieceOption[] = [
  { key: 'bunker-liso', label: 'Bunker liso', shape: 'square', dataName: 'Bunker liso/rampa/canto/coração' },
  { key: 'rampa', label: 'Rampa', shape: 'square', dataName: 'Bunker liso/rampa/canto/coração' },
  { key: 'canto', label: 'Canto', shape: 'triangle', dataName: 'Bunker liso/rampa/canto/coração' },
  { key: 'rifle-garrison', label: 'Rifle Garrison', shape: 'square', dataName: 'Rifle Garrison' },
  { key: 'mg-garrison', label: 'MG Garrison', shape: 'square', dataName: 'MG Garrison' },
  { key: 'at-garrison', label: 'AT Garrison', shape: 'square', dataName: 'AT Gun Garrison' },
  { key: 'howitzer-garrison', label: 'Howitzer Garrison', shape: 'square', dataName: 'Howitzer Garrison' },
  { key: 'observation', label: 'Observation Bunker', shape: 'square', dataName: 'Observation Bunker' },
  { key: 'engine-room', label: 'Engine Room', shape: 'square', dataName: 'Engine Room' },
  { key: 'bunker-core', label: 'Bunker Core', shape: 'square', dataName: 'Bunker Core' },
  {
    key: 'artillery-shelter',
    label: 'Artillery Shelter Room',
    shape: 'square',
    dataName: 'Artillery Shelter Room',
  },
]

export const PIECES_T3: PieceT3Data[] = [
  {
    name: 'Rifle Garrison',
    rawHp: 3750,
    isolatedModifierHint: 0.86,
    cost: { concrete: 15, buildingMaterials: 125, diggingMaterials: 75 },
    confirmedEdgeModifier: 0.740,
    identificationConfidence: 'medium',
  },
  {
    name: 'AT Gun Garrison',
    rawHp: 3450,
    isolatedModifierHint: 0.78,
    cost: { concrete: 20, buildingMaterials: 275, diggingMaterials: 75 },
    confirmedEdgeModifier: null, // TODO: confirmar com teste em par real, não usar hint isolado
    identificationConfidence: 'medium',
  },
  {
    name: 'MG Garrison',
    rawHp: 3750,
    isolatedModifierHint: 0.82,
    cost: { concrete: 25, buildingMaterials: 225, diggingMaterials: 75 },
    confirmedEdgeModifier: null, // TODO: confirmar com teste em par real, não usar hint isolado
    identificationConfidence: 'medium',
  },
  {
    name: 'Bunker liso/rampa/canto/coração',
    rawHp: 3750,
    isolatedModifierHint: 0.97,
    cost: { concrete: 15, buildingMaterials: 75, diggingMaterials: 75 },
    confirmedEdgeModifier: 0.941,
    identificationConfidence: 'high',
  },
  {
    name: 'Engine Room',
    rawHp: 3750,
    isolatedModifierHint: 0.97,
    cost: { concrete: 15, buildingMaterials: 175, diggingMaterials: 75 },
    confirmedEdgeModifier: null, // TODO: confirmar com teste em par real, não usar hint isolado
    identificationConfidence: 'medium',
  },
  {
    name: 'Howitzer Garrison',
    rawHp: 4050,
    isolatedModifierHint: 0.89,
    cost: { concrete: 15, buildingMaterials: 175, diggingMaterials: 75 },
    confirmedEdgeModifier: null, // TODO: confirmar com teste em par real, não usar hint isolado
    identificationConfidence: 'medium',
  },
  {
    name: 'Bunker Core',
    rawHp: 3500,
    isolatedModifierHint: 0.70,
    cost: { concrete: 25, buildingMaterials: 400, diggingMaterials: 75 },
    confirmedEdgeModifier: null, // TODO: confirmar com teste em par real, não usar hint isolado
    identificationConfidence: 'high',
  },
  {
    name: 'Observation Bunker',
    rawHp: 3450,
    isolatedModifierHint: 0.82,
    cost: { concrete: 20, buildingMaterials: 275, diggingMaterials: 75 },
    confirmedEdgeModifier: null, // TODO: confirmar com teste em par real, não usar hint isolado
    identificationConfidence: 'medium',
  },
  {
    name: 'Artillery Shelter Room',
    rawHp: 3450,
    isolatedModifierHint: 0.90,
    cost: { concrete: 10, buildingMaterials: 200, diggingMaterials: 75 },
    confirmedEdgeModifier: 0.672,
    identificationConfidence: 'medium',
  },
]
