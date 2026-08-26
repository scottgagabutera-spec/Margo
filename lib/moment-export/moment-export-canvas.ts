import type { MargoMoment } from '@/lib/moment/types'
import { isMomentRecipientShareable } from '@/lib/moment/share'
import { MARGO_SITE_ORIGIN } from '@/lib/moment/site-origin'
import { margoMomentToPostLines } from '@/lib/moment/resolve'
import {
  normalizeLine,
  renderMomentToCanvas,
  type NormalizedLine,
} from '@/lib/moment-export/render-moment'

export interface MomentExportPlayRegion {
  x: number
  y: number
  w: number
  h: number
}

export interface MomentExportCanvasResult {
  canvas: HTMLCanvasElement
  width: number
  height: number
  playRegion: MomentExportPlayRegion | null
  playLinkUrl: string | null
  /** Human-readable listen destination shown in PDF when a snippet link exists. */
  playLinkLabel: string | null
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
  const playLinkUrl = isStageCard && momentHasSnippet(moment) ? getMomentPlayLinkUrl(moment) : null
  return {
    themeId: moment.themeId,
    shapeId: moment.shapeId,
    vibeLabel: moment.vibeLabel,
    seedKey: moment.seedKey,
    variant: isStageCard ? ('stage-card' as const) : ('poster' as const),
    showPlayControl: !!playLinkUrl,
    playLinkUrl,
  }
}

export function getMomentPlayLinkUrl(moment: MargoMoment): string | null {
  if (!moment.postId || !isMomentRecipientShareable(moment)) return null
  const base = typeof window !== 'undefined' ? window.location.origin : MARGO_SITE_ORIGIN
  return `${base}/post/${moment.postId}`
}

export async function renderMomentExportCanvas(
  moment: MargoMoment,
): Promise<MomentExportCanvasResult | null> {
  if (typeof document === 'undefined') return null

  const normalized = normalizedFromMoment(moment)
  if (normalized.length === 0) return null

  const canvas = document.createElement('canvas')
  const renderOpts = renderOptionsFromMoment(moment)
  const scale = 2
  const playRegion = await renderMomentToCanvas(canvas, {
    lines: normalized,
    ...renderOpts,
    scale,
  })

  const width = canvas.width / scale
  const height = canvas.height / scale
  const playLinkUrl = renderOpts.playLinkUrl

  return {
    canvas,
    width,
    height,
    playRegion: playLinkUrl ? playRegion : null,
    playLinkUrl,
    playLinkLabel: playLinkUrl ? 'Listen on Margo — opens in your browser' : null,
  }
}
