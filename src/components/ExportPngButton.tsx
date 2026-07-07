import { toPng } from 'html-to-image'
import { useState } from 'react'

export interface ExportPngButtonProps {
  targetRef: React.RefObject<HTMLElement | null>
  filename: string
  label?: string
}

// Exporta um nó do DOM como PNG (para colar em documentação/doutrina da UBGE).
// fundo sólido explícito porque os painéis usam fundo semitransparente (bg-black/20) que
// ficaria preto puro/estranho numa imagem exportada sem o contexto da página por trás.
export function ExportPngButton({ targetRef, filename, label = 'Exportar PNG' }: ExportPngButtonProps) {
  const [status, setStatus] = useState<'idle' | 'exporting' | 'error'>('idle')

  async function handleExport() {
    if (!targetRef.current) return
    setStatus('exporting')
    try {
      const dataUrl = await toPng(targetRef.current, { backgroundColor: '#1C1810', pixelRatio: 2 })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = filename
      link.click()
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={status === 'exporting'}
      className="rounded border border-gold/50 px-2 py-1 text-xs font-medium text-gold hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {status === 'exporting' ? 'Exportando...' : status === 'error' ? 'Falhou — tentar de novo' : label}
    </button>
  )
}

export default ExportPngButton
