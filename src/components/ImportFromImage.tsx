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
import { useImportedBunkerStore, type ImportedBunkerStats } from '../store/useImportedBunkerStore'

// Cliente-only por restrição do projeto (ver CLAUDE.md: "tudo client-side" na v1). Não há
// backend para fazer proxy da chamada à Anthropic, então o usuário fornece a PRÓPRIA chave de
// API, guardada só no navegador dele (localStorage — explicitamente permitido pelo CLAUDE.md
// fora do ambiente claude.ai). Isso é o padrão oficial "bring your own key" da SDK
// (`dangerouslyAllowBrowser: true`), não uma chave embutida no bundle.
const API_KEY_STORAGE_KEY = 'ubge-bunker-calc:anthropic-api-key'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // limite conservador do lado do cliente

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function formatFieldValue(value: number | null): string {
  return value === null ? '— (not read)' : new Intl.NumberFormat('en-US').format(value)
}

const FIELD_LABELS: Record<(typeof EXTRACTION_FIELDS)[number], string> = {
  hpTotal: 'Total HP',
  breachPercent: 'Breach %',
  breachHpAbsolute: 'Breach HP (absolute)',
  integrityPercent: 'Structural Integrity %',
  size: 'Size (pieces)',
  repairCost: 'Repair cost',
  repairBmat: 'Repair bmat',
}

const PLACEHOLDER_STATS = [
  '🛠️ 18,940hp (63.7% integ, size 8)',
  '💥 36.3% breach (after 12,058hp)',
  '📊 56.6%+7.1% integ (9/19)',
  '🔨 1,040 repair (18.2hp per bmat)',
  '🏗️ 130 conc 925 bmat 600 dig',
].join('\n')

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
  const [pendingImage, setPendingImage] = useState<{
    base64: string
    mediaType: SupportedMediaType
  } | null>(null)
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
      setErrorMessage('That does not look like an image file.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrorMessage('Image too large (~5MB limit in this version).')
      return
    }

    const dataUrl = await readFileAsDataUrl(file)
    const { base64, mediaType } = splitDataUrl(dataUrl)
    if (!isSupportedMediaType(mediaType)) {
      setErrorMessage('Unsupported image format — use PNG, JPEG, GIF or WEBP.')
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
    const item = Array.from(event.clipboardData.items).find((candidate) =>
      candidate.type.startsWith('image/'),
    )
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
      setErrorMessage(
        error instanceof Error ? error.message : 'Unknown error calling the Anthropic API.',
      )
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-wide text-gold">
          Import Bunker
        </h1>
        <p className="text-sm text-cream/50">
          Bring a finished build from foxbunker.com into the Siege Calculator — no need to rebuild
          it piece by piece.
        </p>
      </header>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <aside className="flex w-full flex-col gap-4 lg:w-96">
          <section className="overflow-hidden rounded-lg border border-gold/25 bg-surface shadow-lg shadow-black/40">
            <div className="border-b border-gold/15 bg-surface-raised px-4 py-2.5">
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-gold">
                Method
              </h2>
            </div>
            <div className="p-4">
              <div className="flex gap-2">
                {(
                  [
                    { key: 'text', label: 'Paste text' },
                    { key: 'image', label: 'Image (AI)' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setMethod(option.key)
                      resetResult()
                    }}
                    aria-pressed={method === option.key}
                    className={`flex-1 rounded-md border px-3 py-2 font-display text-xs font-medium tracking-wide transition-colors ${
                      method === option.key
                        ? 'border-gold bg-gold text-bg-dark'
                        : 'border-cream/25 text-cream/70 hover:border-gold/60 hover:text-cream'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {method === 'text' ? (
                <div className="mt-4 flex flex-col gap-2">
                  <span className="field-label">Stats card text</span>
                  <p className="text-xs leading-relaxed text-cream/55">
                    On foxbunker.com, build or select your bunker, hit{' '}
                    <strong className="text-cream/80">Copy</strong> on the stats card and paste it
                    here. Works offline, no API key needed.
                  </p>
                  <textarea
                    value={pastedText}
                    onChange={(event) => setPastedText(event.target.value)}
                    placeholder={PLACEHOLDER_STATS}
                    rows={7}
                    className="w-full rounded-md border border-cream/20 bg-ink px-2.5 py-2 font-mono text-xs leading-relaxed text-cream transition-colors hover:border-cream/35 focus:border-gold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleParseText(pastedText)}
                    disabled={!pastedText.trim()}
                    className="w-full rounded-md bg-gold px-3 py-2 font-display text-sm font-semibold tracking-wide text-bg-dark transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Read text
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="field-label">Anthropic API key</span>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(event) => persistApiKey(event.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full rounded-md border border-cream/20 bg-ink px-2.5 py-2 text-sm text-cream transition-colors hover:border-cream/35 focus:border-gold focus:outline-none"
                    />
                    <p className="text-[11px] leading-relaxed text-danger/85">
                      Stored only in your browser (localStorage), never sent to any server of ours —
                      only straight to the Anthropic API. Prefer "Paste text" when you can.
                    </p>
                    {apiKey && (
                      <button
                        type="button"
                        onClick={() => persistApiKey('')}
                        className="self-start text-xs text-cream/50 underline transition-colors hover:text-cream"
                      >
                        Forget saved key
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="field-label">Image</span>
                    <div
                      onDrop={handleDrop}
                      onDragOver={(event) => event.preventDefault()}
                      onPaste={handlePaste}
                      tabIndex={0}
                      className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-cream/25 bg-ink/60 p-3 text-center text-xs text-cream/55 transition-colors hover:border-cream/40 focus:border-gold focus:outline-none"
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Pasted screenshot preview"
                          className="max-h-40 rounded"
                        />
                      ) : (
                        <span>Click here and paste (Ctrl+V), or drag an image in</span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      onChange={handleFileInputChange}
                      className="w-full text-xs text-cream/55 file:mr-2 file:rounded file:border-0 file:bg-cream/10 file:px-2 file:py-1 file:text-xs file:text-cream/80"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={!apiKey || !pendingImage || status === 'loading'}
                    className="rounded-md bg-gold px-3 py-2 font-display text-sm font-semibold tracking-wide text-bg-dark transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {status === 'loading' ? 'Analyzing…' : 'Analyze image'}
                  </button>

                  {errorMessage && (
                    <p className="rounded-md border border-danger/25 bg-danger/10 px-2.5 py-2 text-xs text-danger">
                      {errorMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        </aside>

        <section className="flex-1 overflow-hidden rounded-lg border border-cream/12 bg-surface shadow-lg shadow-black/40">
          <div className="border-b border-cream/10 bg-surface-raised px-4 py-2.5">
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-cream/70">
              Extracted Data
            </h2>
          </div>

          <div className="p-4">
            {!parsedData && !parseFailed && (
              <p className="text-sm leading-relaxed text-cream/55">
                {method === 'text'
                  ? 'Paste the text copied from foxbunker and hit "Read text".'
                  : 'Paste an image and hit "Analyze image" to pull the numbers out.'}
              </p>
            )}

            {parsedData && (
              <div className="flex flex-col gap-3">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {EXTRACTION_FIELDS.map((field) => (
                    <div
                      key={field}
                      className="flex items-baseline justify-between gap-3 border-b border-cream/10 pb-1.5"
                    >
                      <dt className="text-cream/55">{FIELD_LABELS[field]}</dt>
                      <dd
                        className={
                          parsedData[field] === null ? 'text-cream/35' : 'font-semibold text-cream'
                        }
                      >
                        {formatFieldValue(parsedData[field])}
                      </dd>
                    </div>
                  ))}
                </dl>

                <button
                  type="button"
                  onClick={handleUseInSiegeCalculator}
                  className="self-start rounded-md bg-gold px-4 py-2 font-display text-sm font-semibold tracking-wide text-bg-dark transition-colors hover:bg-gold/90"
                >
                  {applied ? 'Applied! Send to Siege Calculator again' : 'Use in Siege Calculator'}
                </button>
                {applied && (
                  <p className="rounded-md border border-good/25 bg-good/10 px-2.5 py-2 text-xs leading-relaxed text-good">
                    Data applied — open the "Siege Calculator" tab. The bunker state (T1 / T2 / T3
                    wet / T3 dry) is chosen there.
                  </p>
                )}
              </div>
            )}

            {parseFailed && (
              <div className="flex flex-col gap-2">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-danger">
                  {method === 'text'
                    ? "Couldn't find a foxbunker stats card in that text"
                    : "Couldn't parse the response as strict JSON"}
                </h3>
                {method === 'text' ? (
                  <p className="text-xs leading-relaxed text-cream/55">
                    Check that you copied the whole card — the line with "hp (…% integ, size …)" is
                    required. We never fill in values on our own.
                  </p>
                ) : (
                  <>
                    <p className="text-xs leading-relaxed text-cream/55">
                      Check the raw model response below by hand:
                    </p>
                    <pre className="max-h-64 overflow-auto rounded-md border border-cream/10 bg-ink p-2.5 text-xs text-cream/80">
                      {rawResponseText}
                    </pre>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ImportFromImage
