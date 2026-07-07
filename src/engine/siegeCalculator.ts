import {
  ARTY_SHELTER_BONUS_STEPS,
  EXPLOSIVE_RESISTANCE_BY_TIER,
  type ArtilleryRound,
  type BunkerTier,
} from '../data/damage'
import type { PieceShape } from './grid'
import type { BunkerGraph } from './structuralIntegrity'

export type ShelterCount = 0 | 1 | 2 | 3

// 1. Resistência efetiva da peça-alvo = resistência base do tier + bônus de Arty Shelter.
// fonte: src/data/damage.ts (EXPLOSIVE_RESISTANCE_BY_TIER, ARTY_SHELTER_BONUS_STEPS — Fase 1)
export function computeEffectiveResistance(tier: BunkerTier, shelterCount: ShelterCount): number {
  const baseResistance = EXPLOSIVE_RESISTANCE_BY_TIER[tier]
  if (shelterCount === 0) return baseResistance
  const step = ARTY_SHELTER_BONUS_STEPS[shelterCount - 1]
  return Math.min(baseResistance + step.cumulativeBonus, 1)
}

// 2. Dano efetivo por impacto = dano base do projétil × (1 - resistência efetiva).
// `null` quando o projétil não tem HE confirmado (ex.: Storm Cannon — ver ARTILLERY_ROUNDS).
export function computeEffectiveDamage(round: ArtilleryRound, effectiveResistance: number): number | null {
  if (round.heDamage === null) return null
  return round.heDamage * (1 - effectiveResistance)
}

// 3 e 4. Tiros até breach / até destruir.
// PEGADINHA DO JOGO REAL: numa bunker island o dano é aplicado ao HP compartilhado da ilha
// inteira, mas o dano efetivo por tiro depende da resistência da peça específica que está
// sendo atingida. Por isso `totalHp`/`breachableHealth` aqui SEMPRE vêm do agregado da ilha
// (Fase 2, computeMaxHealth/computeBreachableHealth), nunca de um valor "por peça" — só a
// resistência (via `effectiveDamage`) varia conforme a peça-alvo escolhida.
export function computeShotsUntilBreach(breachableHealth: number, effectiveDamage: number): number {
  if (effectiveDamage <= 0) return Infinity
  return Math.ceil(breachableHealth / effectiveDamage)
}

export function computeShotsUntilDestroy(totalHp: number, effectiveDamage: number): number {
  if (effectiveDamage <= 0) return Infinity
  return Math.ceil(totalHp / effectiveDamage)
}

// 5. Tempo estimado = tiros / (canhões atacantes / cadência em segundos por canhão).
// fonte: cadência não tem valor oficial confirmado na wiki atual.
// TODO: confirmar na wiki — 6.2s é só uma sugestão inicial de preenchimento do input.
export const DEFAULT_UNCONFIRMED_CADENCE_SECONDS = 6.2

export function computeEstimatedTimeSeconds(
  shots: number,
  attackingGuns: number,
  cadenceSeconds: number,
): number {
  if (attackingGuns <= 0 || cadenceSeconds <= 0 || !Number.isFinite(shots)) return Infinity
  const shotsPerSecond = attackingGuns / cadenceSeconds
  return shots / shotsPerSecond
}

// Storm Cannon (300mm): chance fixa de 25% de brecha por impacto, ignora Breachable Health
// (e, por extensão, ignora resistência/shelter para essa chance — ver ARTILLERY_ROUNDS).
export function computeStormCannonExpectedShotsUntilBreach(round: ArtilleryRound): number | null {
  if (!round.ignoresBreachableHealth || round.alwaysBreachChance === null) return null
  // Valor esperado de tentativas até o 1º sucesso numa chance fixa p por tiro: E = 1/p.
  return 1 / round.alwaysBreachChance
}

export interface SiegeCalculationInput {
  tier: BunkerTier
  shelterCount: ShelterCount
  round: ArtilleryRound
  /** HP total agregado da ilha inteira (Max Health — Fase 2), nunca de uma peça isolada. */
  totalHp: number
  /** Breachable Health agregado da ilha inteira (Fase 2). */
  breachableHealth: number
  attackingGuns: number
  cadenceSeconds: number
}

export interface SiegeCalculationResult {
  effectiveResistance: number
  effectiveDamage: number | null
  shotsUntilBreach: number | null
  shotsUntilDestroy: number | null
  estimatedTimeUntilBreachSeconds: number | null
  estimatedTimeUntilDestroySeconds: number | null
  stormCannon: {
    breachChancePerShot: number
    expectedShotsUntilBreach: number
    estimatedTimeUntilBreachSeconds: number
  } | null
}

export function calculateSiege(input: SiegeCalculationInput): SiegeCalculationResult {
  const effectiveResistance = computeEffectiveResistance(input.tier, input.shelterCount)

  if (input.round.ignoresBreachableHealth && input.round.alwaysBreachChance !== null) {
    const expectedShotsUntilBreach = computeStormCannonExpectedShotsUntilBreach(input.round)!
    return {
      effectiveResistance,
      effectiveDamage: null,
      shotsUntilBreach: null,
      shotsUntilDestroy: null,
      estimatedTimeUntilBreachSeconds: null,
      estimatedTimeUntilDestroySeconds: null,
      stormCannon: {
        breachChancePerShot: input.round.alwaysBreachChance,
        expectedShotsUntilBreach,
        estimatedTimeUntilBreachSeconds: computeEstimatedTimeSeconds(
          expectedShotsUntilBreach,
          input.attackingGuns,
          input.cadenceSeconds,
        ),
      },
    }
  }

  const effectiveDamage = computeEffectiveDamage(input.round, effectiveResistance)
  if (effectiveDamage === null) {
    return {
      effectiveResistance,
      effectiveDamage: null,
      shotsUntilBreach: null,
      shotsUntilDestroy: null,
      estimatedTimeUntilBreachSeconds: null,
      estimatedTimeUntilDestroySeconds: null,
      stormCannon: null,
    }
  }

  const shotsUntilBreach = computeShotsUntilBreach(input.breachableHealth, effectiveDamage)
  const shotsUntilDestroy = computeShotsUntilDestroy(input.totalHp, effectiveDamage)

  return {
    effectiveResistance,
    effectiveDamage,
    shotsUntilBreach,
    shotsUntilDestroy,
    estimatedTimeUntilBreachSeconds: computeEstimatedTimeSeconds(
      shotsUntilBreach,
      input.attackingGuns,
      input.cadenceSeconds,
    ),
    estimatedTimeUntilDestroySeconds: computeEstimatedTimeSeconds(
      shotsUntilDestroy,
      input.attackingGuns,
      input.cadenceSeconds,
    ),
    stormCannon: null,
  }
}

// Regra de alcance do bônus de Arty Shelter (Fase 1): bonifica peças adjacentes ao shelter;
// a propagação continua através de peças "canto" (triângulo) mas para ao atravessar uma
// peça "quadrado". Usado para sugerir (não impor) o nº de shelters efetivos de uma peça-alvo
// real do layout montado no BunkerBuilder.
function computeShelterReach(
  graph: BunkerGraph,
  shapeById: Map<string, PieceShape>,
  shelterPieceId: string,
): Set<string> {
  const adjacency = new Map<string, string[]>()
  for (const connection of graph.connections) {
    if (!adjacency.has(connection.pieceIdA)) adjacency.set(connection.pieceIdA, [])
    if (!adjacency.has(connection.pieceIdB)) adjacency.set(connection.pieceIdB, [])
    adjacency.get(connection.pieceIdA)!.push(connection.pieceIdB)
    adjacency.get(connection.pieceIdB)!.push(connection.pieceIdA)
  }

  const reached = new Set<string>()
  const visited = new Set<string>([shelterPieceId])
  const queue: string[] = [shelterPieceId]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor)) continue
      visited.add(neighbor)
      reached.add(neighbor)
      if (shapeById.get(neighbor) === 'triangle') {
        queue.push(neighbor)
      }
    }
  }

  return reached
}

export function computeEffectiveShelterCountForPiece(
  graph: BunkerGraph,
  shapeById: Map<string, PieceShape>,
  shelterPieceIds: string[],
  targetPieceId: string,
): ShelterCount {
  let count = 0
  for (const shelterId of shelterPieceIds) {
    if (shelterId === targetPieceId) continue
    if (computeShelterReach(graph, shapeById, shelterId).has(targetPieceId)) count++
  }
  return Math.min(count, 3) as ShelterCount
}
