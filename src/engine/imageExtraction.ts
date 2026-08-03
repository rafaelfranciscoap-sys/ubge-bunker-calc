import Anthropic from '@anthropic-ai/sdk'
import type { ImportedBunkerStats } from '../store/useImportedBunkerStore'

export type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export function isSupportedMediaType(mediaType: string): mediaType is SupportedMediaType {
  return (
    mediaType === 'image/jpeg' ||
    mediaType === 'image/png' ||
    mediaType === 'image/gif' ||
    mediaType === 'image/webp'
  )
}

export function splitDataUrl(dataUrl: string): { base64: string; mediaType: string } {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl)
  if (!match) throw new Error('Unexpected image format.')
  return { mediaType: match[1], base64: match[2] }
}

export const EXTRACTION_FIELDS = [
  'hpTotal',
  'breachPercent',
  'breachHpAbsolute',
  'integrityPercent',
  'size',
  'repairCost',
  'repairBmat',
] as const

// fonte: pedido explícito da Fase 5 — JSON estrito, só estes campos, nada mais.
export const EXTRACTION_PROMPT = `You are looking at a screenshot of a bunker stats card from the game Foxhole (it may come from foxbunker.com, foxholeplanner, or the in-game upgrade screen).

Extract exactly these fields, if they are visible in the image:
- hpTotal: total HP / Max Health (number)
- breachPercent: Breachable Health percentage (number, e.g. 35 for 35%)
- breachHpAbsolute: absolute Breachable Health value (number)
- integrityPercent: Structural Integrity percentage (number)
- size: bunker size / number of pieces (integer)
- repairCost: repair cost shown on the card (number; if several resources are listed, use the total or the first value shown)
- repairBmat: repair building materials, bmat (number)

Respond ONLY with strict JSON, no text before or after, in exactly this format:
{"hpTotal": number|null, "breachPercent": number|null, "breachHpAbsolute": number|null, "integrityPercent": number|null, "size": number|null, "repairCost": number|null, "repairBmat": number|null}

If a field is not visible or cannot be read with confidence, use null for that field. Do not invent values. Do not include explanations, markdown or extra text — only the JSON object.`

const MODEL = 'claude-sonnet-5'

// Cliente-only por restrição do projeto (ver CLAUDE.md: "tudo client-side" na v1). O usuário
// fornece a PRÓPRIA chave de API (padrão oficial "bring your own key" da SDK,
// `dangerouslyAllowBrowser: true`) — não é uma chave embutida no bundle.
export async function analyzeImage(
  apiKey: string,
  base64: string,
  mediaType: SupportedMediaType,
): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      },
    ],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  return textBlock && 'text' in textBlock ? textBlock.text : ''
}

// Fallback exigido pela Fase 5: se o parsing falhar, retorna null e o chamador deve mostrar
// a resposta bruta para o usuário conferir manualmente — nunca inventar valores.
export function parseExtractionResponse(rawText: string): ImportedBunkerStats | null {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) return null

  const result: Partial<ImportedBunkerStats> = {}
  for (const field of EXTRACTION_FIELDS) {
    const value = (parsed as Record<string, unknown>)[field]
    if (value === null || value === undefined) {
      result[field] = null
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      result[field] = value
    } else if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      result[field] = Number(value)
    } else {
      return null
    }
  }
  return result as ImportedBunkerStats
}
