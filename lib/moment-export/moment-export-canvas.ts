import type { MargoMoment } from '@/lib/moment/types'
import { margoMomentToPostLines } from '@/lib/moment/resolve'
import {
  normalizeLine,
  renderMomentToCanvas,
  type NormalizedLine,
} from '@/lib/moment-export/render-moment'
import { resolveMomentExportListen } from '@/lib/moment-export/export-listen'

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
  playLinkLabel: string | null
}

function normalizedFromMoment(moment: MargoMoment): NormalizedLine[] {
  return margoMomentToPostLines(moment)
    .map(normalizeLine)
    .filter((l) => l.lyric.trim().length > 0)
}

function renderOptionsFromMoment(moment: MargoMoment) {
  const isStageCard = moment.lines.length <= 1
  const listen = resolveMomentExportListen(moment)
  return {
    themeId: moment.themeId,
    shapeId: moment.shapeId,
    vibeLabel: moment.vibeLabel,
    seedKey: moment.seedKey,
    variant: isStageCard ? ('stage-card' as const) : ('poster' as const),
    showPlayControl: !!listen,
    listenBarLabel: listen?.label,
    listenBarHint: listen?.hint,
    flatExportBackground: isStageCard,
    playLinkUrl: listen?.url ?? null,
    playLinkLabel: listen ? `${listen.label} — ${listen.hint}` : null,
  }
}

export async function renderMomentExportCanvas(
  moment: MargoMoment,
): Promise<MomentExportCanvasResult | null> {
  if (typeof document === 'undefined') return null

  const normalized = normalizedFromMoment(moment)
  if (normalized.length === 0) return null

  const canvas = document.createElement('canvas')
  const renderOpts = renderOptionsFromMoment(moment)
  const scale = 3
  const playRegion = await renderMomentToCanvas(canvas, {
    lines: normalized,
    themeId: renderOpts.themeId,
    shapeId: renderOpts.shapeId,
    vibeLabel: renderOpts.vibeLabel,
    seedKey: renderOpts.seedKey,
    variant: renderOpts.variant,
    showPlayControl: renderOpts.showPlayControl,
    listenBarLabel: renderOpts.listenBarLabel,
    listenBarHint: renderOpts.listenBarHint,
    flatExportBackground: renderOpts.flatExportBackground,
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
    playLinkLabel: renderOpts.playLinkLabel,
  }
}
