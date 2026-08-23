import {
  normalizeLine,
  renderMomentToCanvas,
  type MomentLineInput,
  type NormalizedLine,
} from '@/lib/moment-export/render-moment'

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
