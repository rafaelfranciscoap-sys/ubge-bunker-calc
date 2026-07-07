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

const API_KEY_STORAGE_KEY = 'ubge-bunker-calc:anthropic-api-key'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function formatFieldValue(value: number | null): string {
  return value === null ? '—' : new Intl.NumberFormat('pt-BR').format(value)
}

const FIELD_LABELS: Record<(typeof EXTRACTION_FIELDS)[number], string> = {
  hpTotal: 'HP Total',
  breachPercent: 'Breach %',
  breachHpAbsolute: 'Breach HP (absoluto)',
  integrityPercent: 'Integridade %',
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

  const [parsedData, setParsedData] = useState<ImportedBunkerStats | null>(null)
  const [parseFailed, setParseFailed] = useState(false)
  const [applied, setApplied] = useState(false)

  const setImportedData = useImportedBunkerStore((state) => state.setData)
  const setImportedActive = useImportedBunkerStore((state) => state.setActive)

  const [pastedText, setPastedText] = useState('')

  const [apiKey, setApiKeyState] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<{ base64: string; mediaType: SupportedMediaType } | null>(null)
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
      setErrorMessage('Imagem muito grande (limite de ~5MB).')
      return
    }

    const dataUrl = await readFileAsDataUrl(file)
    const { base64, mediaType } = splitDataUrl(dataUrl)
    if (!isSupportedMediaType(mediaType)) {
      setErrorMessage('Formato não suportado — use PNG, JPEG, GIF ou WEBP.')
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
    const item = Array.from(event.clipboardData.items).find((c) => c.type.startsWith('image/'))
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-0 p-4 sm:p-6">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 bg-gold" />
          <h1 className="font-mono text-xs font-bold tracking-[0.2em] text-gold uppercase">Importar Simulação</h1>
        </div>
        <p className="mt-1 font-mono text-[10px] text-cream/30 tracking-wider">
          Traga uma build do foxbunker.com para calcular o cerco sem reconstruir peça por peça
        </p>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Left — controls */}
        <aside className="flex w-full flex-col gap-4 lg:w-80">

          {/* Method selector */}
          <div className="overflow-hidden rounded border border-cream/10 bg-bg-panel">
            <div className="border-b border-cream/8 bg-black/30 px-3 py-2.5">
              <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-cream/50 uppercase">Método de importação</span>
            </div>
            <div className="flex p-1">
              {(
                [
                  { key: 'text', label: 'Colar texto', sub: 'foxbunker.com' },
                  { key: 'image', label: 'Via imagem', sub: 'IA · requer chave' },
                ] as const
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setMethod(option.key)
                    resetResult()
                  }}
                  className={`flex flex-1 flex-col items-center rounded py-3 transition-all ${
                    method === option.key
                      ? 'bg-gold/15 text-gold'
                      : 'text-cream/40 hover:bg-cream/5 hover:text-cream/60'
                  }`}
                >
                  <span className="font-mono text-[10px] font-bold tracking-wider uppercase">{option.label}</span>
                  <span className="font-mono text-[8px] text-current opacity-50 mt-0.5">{option.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {method === 'text' ? (
            <div className="overflow-hidden rounded border border-cream/10 bg-bg-panel">
              <div className="border-b border-cream/8 bg-black/30 px-3 py-2.5">
                <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-cream/50 uppercase">Card de stats do foxbunker</span>
              </div>
              <div className="p-3 flex flex-col gap-3">
                <p className="font-mono text-[10px] leading-relaxed text-cream/30">
                  Monte/selecione o bunker, clique em <span className="text-cream/60 font-bold">Copy</span> no card de estatísticas e cole abaixo. Funciona offline.
                </p>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={'🛠️ 18,940hp (63.7% integ, size 8)\n💥 36.3% breach (after 12,058hp)\n📊 56.6%+7.1% integ (9/19)\n🔨 1,040 repair (18.2hp per bmat)\n🏗️ 130 conc 925 bmat 600 dig'}
                  rows={7}
                  className="w-full rounded border border-cream/15 bg-black/40 px-3 py-2.5 font-mono text-[10px] text-cream/80 focus:border-gold/50 focus:outline-none resize-none transition-colors placeholder:text-cream/20"
                />
                <button
                  type="button"
                  onClick={() => handleParseText(pastedText)}
                  disabled={!pastedText.trim()}
                  className="w-full rounded border border-gold/30 bg-gold/15 py-2.5 font-mono text-[10px] font-bold tracking-[0.15em] text-gold uppercase transition-all hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Ler texto
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded border border-cream/10 bg-bg-panel">
                <div className="border-b border-cream/8 bg-black/30 px-3 py-2.5">
                  <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-cream/50 uppercase">Chave de API · Anthropic</span>
                </div>
                <div className="p-3 flex flex-col gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => persistApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full rounded border border-cream/15 bg-black/40 px-3 py-2.5 font-mono text-xs text-cream focus:border-gold/50 focus:outline-none transition-colors placeholder:text-cream/20"
                  />
                  <p className="font-mono text-[9px] leading-relaxed text-rust/50">
                    Guardada só no seu navegador — nunca enviada a nenhum servidor nosso. Prefira o método texto.
                  </p>
                  {apiKey && (
                    <button
                      type="button"
                      onClick={() => persistApiKey('')}
                      className="self-start font-mono text-[9px] text-cream/25 underline hover:text-cream/50 transition-colors"
                    >
                      Esquecer chave
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded border border-cream/10 bg-bg-panel">
                <div className="border-b border-cream/8 bg-black/30 px-3 py-2.5">
                  <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-cream/50 uppercase">Imagem</span>
                </div>
                <div className="p-3 flex flex-col gap-3">
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onPaste={handlePaste}
                    tabIndex={0}
                    className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-cream/15 bg-black/20 p-3 text-center focus:border-gold/40 focus:outline-none transition-colors hover:border-cream/25"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Prévia da imagem" className="max-h-36 rounded opacity-80" />
                    ) : (
                      <span className="font-mono text-[10px] text-cream/25">
                        Clique aqui e cole (Ctrl+V) ou arraste uma imagem
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    onChange={handleFileInputChange}
                    className="font-mono text-[9px] text-cream/30 file:mr-2 file:rounded file:border file:border-cream/15 file:bg-black/30 file:px-2 file:py-1 file:font-mono file:text-[9px] file:text-cream/50 file:uppercase file:tracking-wider"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!apiKey || !pendingImage || status === 'loading'}
                className="w-full rounded border border-gold/30 bg-gold/15 py-2.5 font-mono text-[10px] font-bold tracking-[0.15em] text-gold uppercase transition-all hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {status === 'loading' ? 'Analisando...' : 'Analisar imagem'}
              </button>

              {errorMessage && (
                <div className="rounded border border-rust/25 bg-rust/8 px-3 py-2">
                  <p className="font-mono text-[10px] text-rust/80">{errorMessage}</p>
                </div>
              )}
            </>
          )}
        </aside>

        {/* Right — results */}
        <div className="flex-1 overflow-hidden rounded border border-cream/10 bg-bg-panel">
          {!parsedData && !parseFailed && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="h-12 w-12 rounded-full border border-cream/10 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-cream/20" />
              </div>
              <p className="font-mono text-[10px] text-cream/25 tracking-wider max-w-xs">
                {method === 'text'
                  ? 'Cole o texto copiado do foxbunker e clique em "Ler texto".'
                  : 'Cole uma imagem e clique em "Analisar imagem" para extrair os números.'}
              </p>
            </div>
          )}

          {parsedData && (
            <div className="flex flex-col gap-0">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-cream/8 bg-black/30 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-olive" />
                  <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-olive/80 uppercase">Dados Extraídos</span>
                </div>
                <button
                  type="button"
                  onClick={handleUseInSiegeCalculator}
                  className="rounded border border-gold/40 bg-gold/20 px-3 py-1.5 font-mono text-[9px] font-bold tracking-[0.15em] text-gold uppercase transition-all hover:bg-gold/30"
                >
                  {applied ? 'Re-aplicar' : 'Usar no Simulador'}
                </button>
              </div>

              {/* Data fields */}
              <div className="grid grid-cols-1 divide-y divide-cream/5 sm:grid-cols-2 sm:divide-y-0">
                {EXTRACTION_FIELDS.map((field, i) => (
                  <div
                    key={field}
                    className={`flex items-center justify-between px-4 py-2.5 ${
                      i % 2 === 0 ? 'sm:border-r border-cream/5' : ''
                    } border-b border-cream/5`}
                  >
                    <span className="font-mono text-[10px] text-cream/40">{FIELD_LABELS[field]}</span>
                    <span className="font-mono text-xs font-semibold tabular-nums text-cream/90">
                      {formatFieldValue(parsedData[field])}
                    </span>
                  </div>
                ))}
              </div>

              {applied && (
                <div className="border-t border-olive/20 bg-olive/8 px-4 py-2.5">
                  <p className="font-mono text-[10px] text-olive/70 tracking-wide">
                    Dados aplicados — abra a aba Simulação de Cerco. O estado do bunker (T1/T2/T3) é escolhido lá.
                  </p>
                </div>
              )}
            </div>
          )}

          {parseFailed && (
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rust" />
                <h2 className="font-mono text-[10px] font-bold tracking-[0.2em] text-rust/80 uppercase">
                  {method === 'text' ? 'Texto não reconhecido' : 'Resposta inválida'}
                </h2>
              </div>
              {method === 'text' ? (
                <p className="font-mono text-[10px] leading-relaxed text-cream/30">
                  Confira se você copiou o card completo. A linha com "hp (…% integ, size …)" é obrigatória.
                </p>
              ) : (
                <>
                  <p className="font-mono text-[10px] text-cream/30">Resposta bruta do modelo:</p>
                  <pre className="max-h-64 overflow-auto rounded border border-cream/10 bg-black/40 p-3 font-mono text-[9px] text-cream/50 leading-relaxed">
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
