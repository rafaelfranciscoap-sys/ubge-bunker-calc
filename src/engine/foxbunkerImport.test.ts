import { describe, expect, it } from 'vitest'
import { parseFoxbunkerStats } from './foxbunkerImport'

// Texto real copiado do botão "Copy" do foxbunker.com (formato confirmado no fonte).
const MULTI_TILE = `\`\`\`
🛠️ 18,940hp (63.7% integ, size 8)
💥 36.3% breach (after 12,058hp)
📊 56.6%+7.1% integ (9/19)
🔨 1,040 repair (18.2hp per bmat)
🏗️ 130 conc 925 bmat 600 dig
\`\`\``

const SINGLE_TILE = `🛠️ 3,750hp (100.0% integ, size 1)
📊 [97.0% integ in size >1]
🔨 120 repair (31.2hp per bmat)
🏗️ 15 conc 75 bmat 75 dig`

describe('parseFoxbunkerStats', () => {
  it('parses a multi-tile card copied from foxbunker', () => {
    const result = parseFoxbunkerStats(MULTI_TILE)!
    expect(result).not.toBeNull()
    expect(result.stats.hpTotal).toBe(18940)
    expect(result.stats.integrityPercent).toBe(63.7)
    expect(result.stats.size).toBe(8)
    expect(result.stats.breachPercent).toBe(36.3)
    // breachHpAbsolute = HP total − limiar "after" = 18940 − 12058
    expect(result.stats.breachHpAbsolute).toBe(6882)
    expect(result.breachThresholdHp).toBe(12058)
    expect(result.greenDots).toBe(9)
    expect(result.totalDots).toBe(19)
    expect(result.stats.repairBmat).toBe(1040)
    expect(result.stats.repairCost).toBe(1040)
    // custo de construção: "130 conc 925 bmat 600 dig"
    expect(result.stats.constructionConcrete).toBe(130)
    expect(result.stats.constructionBmat).toBe(925)
    expect(result.stats.constructionDigging).toBe(600)
  })

  it('parses a single-tile card (no breach line, integ shown as size>1 note)', () => {
    const result = parseFoxbunkerStats(SINGLE_TILE)!
    expect(result.stats.hpTotal).toBe(3750)
    expect(result.stats.integrityPercent).toBe(100)
    expect(result.stats.size).toBe(1)
    // sem linha de breach → breachHpAbsolute e limiar ficam null (não inventados)
    expect(result.stats.breachPercent).toBeNull()
    expect(result.stats.breachHpAbsolute).toBeNull()
    expect(result.breachThresholdHp).toBeNull()
  })

  it('returns null for text without the main hp/integ/size line', () => {
    expect(parseFoxbunkerStats('só um texto qualquer')).toBeNull()
    expect(parseFoxbunkerStats('')).toBeNull()
  })
})
