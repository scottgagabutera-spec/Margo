import type { MargoMoment } from '@/lib/moment/types'
import { jsPDF } from 'jspdf'
import {
  renderMomentExportCanvas,
  type MomentExportCanvasResult,
} from '@/lib/moment-export/moment-export-canvas'
import { slugify } from '@/lib/moment-export/save-moment-image'

function exportFilename(moment: MargoMoment, ext: 'pdf' | 'png'): string {
  const primary = moment.lines[0]
  const base = moment.lines.length > 1
    ? 'Moment'
    : slugify(primary?.songTitle || '', 'Lyric')
  return `MARGO_${base}_Moment.${ext}`
}

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png', 1.0)
}

function buildPdfFromExport(result: MomentExportCanvasResult): jsPDF {
  const { canvas, width, height, playRegion, playLinkUrl, playLinkLabel } = result
  const footerH = playLinkUrl ? 28 : 0
  const pageH = height + footerH
  const orientation = width >= pageH ? 'landscape' : 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [width, pageH],
    compress: false,
  })

  pdf.addImage(canvasToDataUrl(canvas), 'PNG', 0, 0, width, height, undefined, 'SLOW')

  if (playRegion && playLinkUrl) {
    pdf.link(playRegion.x, playRegion.y, playRegion.w, playRegion.h, { url: playLinkUrl })
  }

  if (playLinkUrl && playLinkLabel) {
    pdf.setFontSize(9)
    pdf.setTextColor(55, 55, 55)
    pdf.textWithLink(playLinkLabel, 16, height + 18, { url: playLinkUrl })
  }

  return pdf
}

export async function renderMargoMomentPdfFile(
  moment: MargoMoment,
): Promise<File | null> {
  if (typeof document === 'undefined') return null
  const result = await renderMomentExportCanvas(moment)
  if (!result) return null

  const pdf = buildPdfFromExport(result)
  const blob = pdf.output('blob')
  return new File([blob], exportFilename(moment, 'pdf'), { type: 'application/pdf' })
}

export async function saveMargoMomentPdf(moment: MargoMoment): Promise<void> {
  const file = await renderMargoMomentPdfFile(moment)
  if (!file) return

  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export type ShareMomentPdfResult = 'shared' | 'failed'

export async function shareMargoMomentPdf(moment: MargoMoment): Promise<ShareMomentPdfResult> {
  if (typeof navigator === 'undefined' || !navigator.share) return 'failed'

  const file = await renderMargoMomentPdfFile(moment)
  if (!file) return 'failed'

  if (typeof navigator.canShare === 'function') {
    try {
      if (!navigator.canShare({ files: [file] })) return 'failed'
    } catch {
      return 'failed'
    }
  }

  try {
    await navigator.share({ files: [file], title: 'MARGO' })
    return 'shared'
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return 'failed'
    return 'failed'
  }
}
