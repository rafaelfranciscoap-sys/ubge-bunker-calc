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
  if (!match) throw new Error('Formato de imagem inesperado.')
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
export const EXTRACTION_PROMPT = `Você está vendo uma captura de tela de um card de estatísticas de bunker do jogo Foxhole (pode ser do foxbunker.com, do foxholeplanner, ou da tela de upgrade dentro do próprio jogo).

Extraia exatamente estes campos, se estiverem visíveis na imagem:
- hpTotal: HP total / Max Health (número)
- breachPercent: % de Breachable Health (número, ex.: 35 para 35%)
- breachHpAbsolute: valor absoluto de Breachable Health (número)
- integrityPercent: % de Structural Integrity (número)
- size: tamanho / número de peças do bunker (número inteiro)
- repairCost: custo de reparo mostrado no card (número; se houver múltiplos recursos, use o valor total ou o primeiro valor mostrado)
- repairBmat: building materials (bmat) de reparo (número)

Responda SOMENTE com um JSON estrito, sem nenhum texto antes ou depois, exatamente neste formato:
{"hpTotal": number|null, "breachPercent": number|null, "breachHpAbsolute": number|null, "integrityPercent": number|null, "size": number|null, "repairCost": number|null, "repairBmat": number|null}

Se um campo não estiver visível ou não puder ser lido com confiança, use null para esse campo. Não invente valores. Não inclua explicações, markdown ou texto adicional — apenas o objeto JSON.`

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
