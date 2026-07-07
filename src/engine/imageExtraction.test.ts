import { describe, expect, it } from 'vitest'
import { isSupportedMediaType, parseExtractionResponse, splitDataUrl } from './imageExtraction'

describe('isSupportedMediaType', () => {
  it('accepts the four supported image types', () => {
    expect(isSupportedMediaType('image/png')).toBe(true)
    expect(isSupportedMediaType('image/jpeg')).toBe(true)
    expect(isSupportedMediaType('image/gif')).toBe(true)
    expect(isSupportedMediaType('image/webp')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isSupportedMediaType('image/bmp')).toBe(false)
    expect(isSupportedMediaType('application/pdf')).toBe(false)
  })
})

describe('splitDataUrl', () => {
  it('splits a data URL into media type and base64 payload', () => {
    expect(splitDataUrl('data:image/png;base64,AAAA')).toEqual({
      mediaType: 'image/png',
      base64: 'AAAA',
    })
  })

  it('throws on a malformed data URL', () => {
    expect(() => splitDataUrl('not-a-data-url')).toThrow()
  })
})

describe('parseExtractionResponse', () => {
  it('parses strict JSON with all fields present', () => {
    const raw = JSON.stringify({
      hpTotal: 16867,
      breachPercent: 35,
      breachHpAbsolute: 5903,
      integrityPercent: 65,
      size: 6,
      repairCost: 1200,
      repairBmat: 300,
    })
    expect(parseExtractionResponse(raw)).toEqual({
      hpTotal: 16867,
      breachPercent: 35,
      breachHpAbsolute: 5903,
      integrityPercent: 65,
      size: 6,
      repairCost: 1200,
      repairBmat: 300,
    })
  })

  it('accepts null for fields not visible in the image', () => {
    const raw = JSON.stringify({
      hpTotal: 9000,
      breachPercent: null,
      breachHpAbsolute: null,
      integrityPercent: null,
      size: 4,
      repairCost: null,
      repairBmat: null,
    })
    const result = parseExtractionResponse(raw)
    expect(result?.hpTotal).toBe(9000)
    expect(result?.breachPercent).toBeNull()
  })

  it('strips a ```json fenced code block before parsing', () => {
    const raw = '```json\n{"hpTotal": 100, "breachPercent": 10, "breachHpAbsolute": 10, "integrityPercent": 90, "size": 1, "repairCost": 5, "repairBmat": 5}\n```'
    expect(parseExtractionResponse(raw)?.hpTotal).toBe(100)
  })

  it('returns null for invalid JSON (triggers the manual-review fallback)', () => {
    expect(parseExtractionResponse('Desculpe, não consigo ler essa imagem com clareza.')).toBeNull()
  })

  it('returns null when a required field has the wrong type', () => {
    const raw = JSON.stringify({
      hpTotal: 'muito HP',
      breachPercent: 35,
      breachHpAbsolute: 5903,
      integrityPercent: 65,
      size: 6,
      repairCost: 1200,
      repairBmat: 300,
    })
    expect(parseExtractionResponse(raw)).toBeNull()
  })

  it('treats an entirely missing field the same as an explicit null', () => {
    const raw = JSON.stringify({ hpTotal: 100 })
    const result = parseExtractionResponse(raw)
    expect(result?.hpTotal).toBe(100)
    expect(result?.breachPercent).toBeNull()
    expect(result?.size).toBeNull()
  })
})
