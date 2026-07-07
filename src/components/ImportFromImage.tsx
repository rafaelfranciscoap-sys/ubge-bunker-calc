import { useEffect, useState } from 'react'
import { parseFoxbunkerStats } from '../engine/foxbunkerImport'
import {
  analyzeImage,
  EXTRACTION_FIELDS,
  isSupportedMediaType,
  parseExtractionResponse,
  splitDataUrl,
  type SupportedMediaType,
} from '../engine/imageExtraction'
import {
  useImportedBunkerStore,
  type ImportedBunkerStats,
} from '../store/useImportedBunkerStore'

// Cliente-only por restrição do projeto (ver CLAUDE.md: "tudo client-side" na v1). Não há
// backend para fazer proxy da chamada à Anthropic, então o usuário fornece a PRÓPRIA chave de
// API, guardada só no navegador dele (localStorage — explicitamente permitido pelo CLAUDE.md
// fora do ambiente claude.ai). Isso é o padrão oficial "bring your own key" da SDK
// (`dangerouslyAllowBrowser: true`), não uma chave embutida no bundle.
const API_KEY_STORAGE_KEY = 'ubge-bunker-calc:anthropic-api-key'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // limite conservador do lado do cliente, não documentado oficialmente

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function formatFieldValue(value: number | null): string {
  return value === null ? '— (não lido)' : new Intl.NumberFormat('pt-BR').format(value)
}

const FIELD_LABELS: Record<(typeof EXTRACTION_FIELDS)[number], string> = {
  hpTotal: 'HP Total',
  breachPercent: 'Breach %',
  breachHpAbsolute: 'Breach HP (absoluto)',
  integrityPercent: 'Structural Integrity %',
  size: 'Tamanho (peças)',
  repairCost: 'Custo de reparo',
  repairBmat: 'Bmat de reparo',
}

type ImportMethod = 'text' | 'image'

export interface ImportFromImageProps {
  onImported?: () => void
}

export function ImportFromImage({ onImported }: ImportFromImageProps) {
  const [method, setMethod] = useState<ImportMethod>('text')

  // --- comum ---
  const [parsedData, setParsedData] = useState<ImportedBunkerStats | null>(null)
  const [parseFailed, setParseFailed] = useState(false)
  const [applied, setApplied] = useState(false)

  const setImportedData = useImportedBunkerStore((state) => state.setData)
  const setImportedActive = useImportedBunkerStore((state) => state.setActive)

  // --- método texto (foxbunker) ---
  const [pastedText, setPastedText] = useState('')

  // --- método imagem (IA) ---
  const [apiKey, setApiKeyState] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<{ base64: string; mediaType: SupportedMediaType } | null>(
    null,
  )
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [rawResponseText, setRawResponseText] = useState('')

  useEffect(() => {
    const saved = window.localStorage.getItem(API_KEY_STORAGE_KEY)
    if (saved) setApiKeyState(saved)
  }, [])

  function resetResult() {
    setParsedData(null)
    setParseFailed(false)
    setApplied(false)
  }

  function persistApiKey(key: string) {
    setApiKeyState(key)
    if (key) {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, key)
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY)
    }
  }

  function handleParseText(text: string) {
    resetResult()
    const result = parseFoxbunkerStats(text)
    if (result) {
      setParsedData(result.stats)
      setParseFailed(false)
    } else {
      setParsedData(null)
      setParseFailed(true)
    }
  }

  async function handleFile(file: File) {
    setErrorMessage(null)
    setStatus('idle')
    resetResult()

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Isso não parece ser um arquivo de imagem.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrorMessage('Imagem muito grande (limite de ~5MB nesta versão).')
      return
    }

    const dataUrl = await readFileAsDataUrl(file)
    const { base64, mediaType } = splitDataUrl(dataUrl)
    if (!isSupportedMediaType(mediaType)) {
      setErrorMessage('Formato de imagem não suportado — use PNG, JPEG, GIF ou WEBP.')
      return
    }

    setImagePreview(dataUrl)
    setPendingImage({ base64, mediaType })
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const item = Array.from(event.clipboardData.items).find((candidate) => candidate.type.startsWith('image/'))
    const file = item?.getAsFile()
    if (file) void handleFile(file)
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void handleFile(file)
  }

  async function handleAnalyze() {
    if (!pendingImage || !apiKey) return
    setStatus('loading')
    setErrorMessage(null)
    try {
      const text = await analyzeImage(apiKey, pendingImage.base64, pendingImage.mediaType)
      setRawResponseText(text)
      const parsed = parseExtractionResponse(text)
      if (parsed) {
        setParsedData(parsed)
        setParseFailed(false)
      } else {
        setParsedData(null)
        setParseFailed(true)
      }
      setStatus('done')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido ao chamar a API da Anthropic.')
    }
  }

  function handleUseInSiegeCalculator() {
    if (!parsedData) return
    setImportedData(parsedData)
    setImportedActive(true)
    setApplied(true)
    onImported?.()
  }

  return (
    <div className="min-h-screen bg-bg-dark text-cream flex flex-col">
      <header className="border-b border-gold/30 px-6 py-4">
        <h1 className="text-xl font-semibold text-gold">Importar simulação</h1>
        <p className="text-sm text-cream/60">
          Traga uma simulação pronta do foxbunker.com para a Simulação de Cerco, sem reconstruir o
          bunker peça por peça.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        <aside className="flex w-full flex-col gap-4 lg:w-96">
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold">Método</h2>
            <div className="flex gap-2">
              {(
                [
                  { key: 'text', label: 'Colar texto (foxbunker)' },
                  { key: 'image', label: 'Imagem (IA, requer chave)' },
                ] as const
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setMethod(option.key)
                    resetResult()
                  }}
                  className={`flex-1 rounded border px-3 py-2 text-xs font-medium transition-colors ${
                    method === option.key
                      ? 'border-gold bg-gold text-bg-dark'
                      : 'border-cream/30 text-cream hover:border-gold/60'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          {method === 'text' ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold">
                Texto do card de stats
              </h2>
              <p className="mb-2 text-xs text-cream/60">
                No foxbunker.com, monte/selecione o bunker, clique em <strong>Copy</strong> no card de
                estatísticas e cole aqui. Funciona offline, sem chave de API.
              </p>
              <textarea
                value={pastedText}
                onChange={(event) => setPastedText(event.target.value)}
                placeholder={
                  '🛠️ 18,940hp (63.7% integ, size 8)\n💥 36.3% breach (after 12,058hp)\n📊 56.6%+7.1% integ (9/19)\n🔨 1,040 repair (18.2hp per bmat)\n🏗️ 130 conc 925 bmat 600 dig'
                }
                rows={7}
                className="w-full rounded border border-cream/30 bg-black/30 px-2 py-2 font-mono text-xs text-cream"
              />
              <button
                type="button"
                onClick={() => handleParseText(pastedText)}
                disabled={!pastedText.trim()}
                className="mt-2 w-full rounded bg-gold px-3 py-2 text-sm font-semibold text-bg-dark hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ler texto
              </button>
            </section>
          ) : (
            <>
              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold">
                  Chave de API da Anthropic
                </h2>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => persistApiKey(event.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full rounded border border-cream/30 bg-black/30 px-2 py-2 text-sm text-cream"
                />
                <p className="mt-1 text-xs text-rust">
                  Guardada só no seu navegador (localStorage), nunca enviada a nenhum servidor nosso
                  — só direto para a API da Anthropic. Prefira o método "Colar texto" quando possível.
                </p>
                {apiKey && (
                  <button
                    type="button"
                    onClick={() => persistApiKey('')}
                    className="mt-2 text-xs text-cream/50 underline hover:text-cream"
                  >
                    Esquecer chave salva
                  </button>
                )}
              </section>

              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold">Imagem</h2>
                <div
                  onDrop={handleDrop}
                  onDragOver={(event) => event.preventDefault()}
                  onPaste={handlePaste}
                  tabIndex={0}
                  className="flex min-h-32 flex-col items-center justify-center gap-2 rounded border border-dashed border-cream/30 bg-black/20 p-3 text-center text-xs text-cream/60 focus:border-gold focus:outline-none"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Prévia da captura colada" className="max-h-40 rounded" />
                  ) : (
                    <span>Clique aqui e cole (Ctrl+V) ou arraste uma imagem</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={handleFileInputChange}
                  className="mt-2 w-full text-xs text-cream/60"
                />
              </section>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!apiKey || !pendingImage || status === 'loading'}
                className="rounded bg-gold px-3 py-2 text-sm font-semibold text-bg-dark hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {status === 'loading' ? 'Analisando...' : 'Analisar imagem'}
              </button>

              {errorMessage && <p className="text-xs text-rust">{errorMessage}</p>}
            </>
          )}
        </aside>

        <div className="flex-1 rounded border border-cream/10 bg-black/20 p-4">
          {!parsedData && !parseFailed && (
            <p className="text-sm text-cream/60">
              {method === 'text'
                ? 'Cole o texto copiado do foxbunker e clique em "Ler texto".'
                : 'Cole uma imagem e clique em "Analisar imagem" para extrair os números.'}
            </p>
          )}

          {parsedData && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gold">
                Dados extraídos
              </h2>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {EXTRACTION_FIELDS.map((field) => (
                  <div key={field} className="flex justify-between border-b border-cream/10 pb-1">
                    <dt className="text-cream/60">{FIELD_LABELS[field]}</dt>
                    <dd>{formatFieldValue(parsedData[field])}</dd>
                  </div>
                ))}
              </dl>

              <button
                type="button"
                onClick={handleUseInSiegeCalculator}
                className="self-start rounded-md bg-gold px-4 py-2 text-sm font-semibold text-bg-dark hover:bg-gold/90"
              >
                {applied ? 'Aplicado! Reenviar para Simulação de Cerco' : 'Usar na Simulação de Cerco'}
              </button>
              {applied && (
                <p className="text-xs text-olive">
                  Dados aplicados — abra a aba "Simulação de Cerco". O estado do bunker (T1/T2/T3
                  molhado/seco) é escolhido lá.
                </p>
              )}
            </div>
          )}

          {parseFailed && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-rust">
                {method === 'text'
                  ? 'Não reconheci um card do foxbunker nesse texto'
                  : 'Não consegui interpretar a resposta como JSON estrito'}
              </h2>
              {method === 'text' ? (
                <p className="text-xs text-cream/60">
                  Confira se você copiou o card inteiro (a linha com "hp (…% integ, size …)" é
                  obrigatória). Não preenchemos valores por conta própria.
                </p>
              ) : (
                <>
                  <p className="text-xs text-cream/60">
                    Confira manualmente a resposta bruta do modelo abaixo:
                  </p>
                  <pre className="max-h-64 overflow-auto rounded bg-black/40 p-2 text-xs text-cream/80">
                    {rawResponseText}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportFromImage
