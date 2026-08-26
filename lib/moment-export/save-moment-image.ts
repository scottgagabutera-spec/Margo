import type { MargoMoment } from '@/lib/moment/types'
import { margoMomentToPostLines } from '@/lib/moment/resolve'
import {
  normalizeLine,
  renderMomentToCanvas,
  type MomentLineInput,
  type NormalizedLine,
} from '@/lib/moment-export/render-moment'
import { renderMomentExportCanvas } from '@/lib/moment-export/moment-export-canvas'

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve()
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      resolve()
    }, 'image/png')
  })
}

export function slugify(text: string, fallback: string): string {
  const s = (text || '')
    .trim()
    .replace(/[^a-z0-9\s]/gi, '')
    .split(/\s+/)
    .slice(0, 3)
    .join('-')
    .toLowerCase()
  return s || fallback
}

export interface SaveMomentImageOptions {
  lines: MomentLineInput[]
  vibeLabel?: string | null
  themeId?: string
  shapeId?: string
  seedKey?: string
  filename?: string
}

function normalizedFromMoment(moment: MargoMoment): NormalizedLine[] {
  return margoMomentToPostLines(moment)
    .map(normalizeLine)
    .filter((l) => l.lyric.trim().length > 0)
}

function momentHasSnippet(moment: MargoMoment): boolean {
  const line = moment.lines[0]
  if (!line) return false
  return !!(
    line.audioUrl
    && line.snippetStart != null
    && line.snippetEnd != null
    && line.snippetEnd > line.snippetStart
  )
}

function renderOptionsFromMoment(moment: MargoMoment) {
  const isStageCard = moment.lines.length <= 1
  return {
    themeId: moment.themeId,
    shapeId: moment.shapeId,
    vibeLabel: moment.vibeLabel,
    seedKey: moment.seedKey,
    variant: isStageCard ? ('stage-card' as const) : ('poster' as const),
    showPlayControl: isStageCard && momentHasSnippet(moment),
  }
}

export async function saveMargoMomentImage(
  moment: MargoMoment,
  options?: { filename?: string },
): Promise<void> {
  const result = await renderMomentExportCanvas(moment)
  if (!result) return

  const primary = normalizedFromMoment(moment)[0]
  const renderOpts = renderOptionsFromMoment(moment)
  const base = normalizedFromMoment(moment).length > 1 ? 'Moment' : slugify(primary.songTitle || '', 'Lyric')
  const shapeLabel = renderOpts.variant === 'stage-card'
    ? 'Moment'
    : moment.shapeId === 'vertical' ? 'Story' : moment.shapeId === 'wide' ? 'Wide' : 'Square'
  const filename = options?.filename ?? `MARGO_${base}_${shapeLabel}.png`
  await downloadCanvas(result.canvas, filename)
}

export async function renderMargoMomentPngFile(
  moment: MargoMoment,
): Promise<File | null> {
  if (typeof document === 'undefined') return null
  const result = await renderMomentExportCanvas(moment)
  if (!result) return null

  const blob = await new Promise<Blob | null>((resolve) => {
    result.canvas.toBlob((b) => resolve(b), 'image/png')
  })
  if (!blob) return null

  const primary = normalizedFromMoment(moment)[0]
  const renderOpts = renderOptionsFromMoment(moment)
  const base = normalizedFromMoment(moment).length > 1 ? 'Moment' : slugify(primary.songTitle || '', 'Lyric')
  const shapeLabel = renderOpts.variant === 'stage-card'
    ? 'Moment'
    : moment.shapeId === 'vertical' ? 'Story' : moment.shapeId === 'wide' ? 'Wide' : 'Square'
  return new File([blob], `MARGO_${base}_${shapeLabel}.png`, { type: 'image/png' })
}

export type ShareMomentImageResult = 'shared' | 'failed'

/** Share PNG only — separate from URL share (do not combine url + files). */
export async function shareMargoMomentImage(moment: MargoMoment): Promise<ShareMomentImageResult> {
  if (typeof navigator === 'undefined' || !navigator.share) return 'failed'

  const file = await renderMargoMomentPngFile(moment)
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

export async function saveMomentImage(options: SaveMomentImageOptions): Promise<void> {
  const normalized: NormalizedLine[] = options.lines
    .map(normalizeLine)
    .filter((l) => l.lyric.trim().length > 0)
  if (normalized.length === 0) return

  const canvas = document.createElement('canvas')
  await renderMomentToCanvas(canvas, {
    lines: normalized,
    themeId: options.themeId ?? 'gold',
    shapeId: options.shapeId ?? 'square',
    vibeLabel: options.vibeLabel,
    seedKey: options.seedKey,
  })

  const primary = normalized[0]
  const base = normalized.length > 1 ? 'Moment' : slugify(primary.songTitle || '', 'Lyric')
  const filename = options.filename ?? 'MARGO_' + base + '_Square.png'
  await downloadCanvas(canvas, filename)
}
