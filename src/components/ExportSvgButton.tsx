import { toSvg } from 'html-to-image'
import { useState } from 'react'

export interface ExportSvgButtonProps {
  targetRef: React.RefObject<HTMLElement | null>
  filename: string
  label?: string
}

export function ExportSvgButton({ targetRef, filename, label = 'Salvar SVG' }: ExportSvgButtonProps) {
  const [status, setStatus] = useState<'idle' | 'exporting' | 'error'>('idle')

  async function handleExport() {
    if (!targetRef.current) return
    setStatus('exporting')
    try {
      const dataUrl = await toSvg(targetRef.current, { backgroundColor: '#1C1810' })
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
      className="text-xs text-gold underline decoration-gold/40 underline-offset-2 hover:decoration-gold disabled:cursor-not-allowed disabled:opacity-50"
    >
      {status === 'exporting' ? 'Exportando...' : status === 'error' ? 'Falhou' : label}
    </button>
  )
}

export default ExportSvgButton
