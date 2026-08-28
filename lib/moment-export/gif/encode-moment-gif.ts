import type { MargoMoment } from '@/lib/moment/types'
import {
  buildMomentTimeline,
  momentHasPlayableSnippet,
  snippetDurationSec,
} from '@/lib/moment-export/timeline/build-moment-timeline'
import {
  buildCanvasTextMeasure,
  resolveStageCardLayout,
  resolveGeistFontFamily,
  waitForExportFonts,
} from '@/lib/moment-export/layout'
import { renderMomentFrame } from '@/lib/moment-export/video/render-moment-frame'
import { loadMomentArtwork } from '@/lib/moment-export/video/load-artwork'
import {
  MOMENT_GIF_EXPORT_WIDTH,
  MOMENT_GIF_FPS,
} from '@/lib/moment-export/gif/constants'
import {
  exportTotalDurationSec,
  resolveExportRenderTimeSec,
} from '@/lib/moment-export/video/export-frame-timing'

const PALETTE_FORMAT = 'rgb565'

export interface EncodeMomentGifProgress {
  phase: 'prepare' | 'frames' | 'finalize'
  frame?: number
  frameCount?: number
}

export interface EncodeMomentGifResult {
  blob: Blob
  durationSec: number
  frameCount: number
  fileSizeBytes: number
  encodeMs: number
  width: number
  height: number
  fps: number
}

function subsampleRgba(rgba: Uint8ClampedArray, step = 3): Uint8Array {
  const out: number[] = []
  for (let i = 0; i < rgba.length; i += 4 * step) {
    out.push(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3])
  }
  return new Uint8Array(out)
}

function concatRgba(chunks: Uint8Array[]): Uint8Array {
  let total = 0
  for (const c of chunks) total += c.length
  const out = new Uint8Array(total)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.length
  }
  return out
}

export async function encodeMargoMomentGif(
  moment: MargoMoment,
  onProgress?: (p: EncodeMomentGifProgress) => void,
  signal?: AbortSignal,
): Promise<EncodeMomentGifResult> {
  if (!momentHasPlayableSnippet(moment)) {
    throw new Error('This Moment needs a playable audio snippet for GIF export')
  }

  const line = moment.lines[0]
  const t0 = performance.now()

  onProgress?.({ phase: 'prepare' })
  await waitForExportFonts()
  const geistFamily = resolveGeistFontFamily()
  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')
  if (!measureCtx) throw new Error('Canvas is not available')
  const measure = buildCanvasTextMeasure(measureCtx)

  const layout = resolveStageCardLayout({
    lyric: line.lyric,
    songTitle: line.songTitle,
    artistName: line.artistName,
    artworkUrl: line.artworkUrl,
    vibeLabel: moment.vibeLabel,
    themeId: moment.themeId,
    outputWidthPx: MOMENT_GIF_EXPORT_WIDTH,
    includeVibePill: !!moment.vibeLabel?.trim(),
  }, measure, geistFamily)

  const artworkImage = await loadMomentArtwork(line.artworkUrl)
  const audioDurationSec = snippetDurationSec(moment)
  const timeline = buildMomentTimeline(moment, audioDurationSec)
  const totalDurationSec = exportTotalDurationSec(audioDurationSec)
  const frameCount = Math.max(1, Math.round(totalDurationSec * MOMENT_GIF_FPS))
  const delayMs = 1000 / MOMENT_GIF_FPS

  const W = layout.outputWidth
  const H = layout.outputHeight
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is not available')

  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')

  const sampleIndices = [...new Set([
    0,
    Math.floor(frameCount / 2),
    Math.floor(frameCount * 0.82),
    frameCount - 1,
  ])].sort((a, b) => a - b)

  const samples: Uint8Array[] = []
  for (const idx of sampleIndices) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const renderTimeSec = resolveExportRenderTimeSec(idx, MOMENT_GIF_FPS, audioDurationSec)
    renderMomentFrame(ctx, layout, timeline, { artworkImage }, renderTimeSec)
    samples.push(subsampleRgba(ctx.getImageData(0, 0, W, H).data))
  }
  const globalPalette = quantize(concatRgba(samples), 256, { format: PALETTE_FORMAT })

  const gif = GIFEncoder()
  onProgress?.({ phase: 'frames', frame: 0, frameCount })

  for (let frame = 0; frame < frameCount; frame++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const renderTimeSec = resolveExportRenderTimeSec(frame, MOMENT_GIF_FPS, audioDurationSec)
    renderMomentFrame(ctx, layout, timeline, { artworkImage }, renderTimeSec)
    const rgba = ctx.getImageData(0, 0, W, H).data
    const index = applyPalette(rgba, globalPalette, { format: PALETTE_FORMAT })
    gif.writeFrame(index, W, H, { palette: globalPalette, delay: delayMs })
    if (frame % MOMENT_GIF_FPS === 0) {
      onProgress?.({ phase: 'frames', frame, frameCount })
    }
  }

  onProgress?.({ phase: 'finalize' })
  gif.finish()
  const bytes = gif.bytes()
  const blob = new Blob([bytes], { type: 'image/gif' })

  return {
    blob,
    durationSec: totalDurationSec,
    frameCount,
    fileSizeBytes: blob.size,
    encodeMs: performance.now() - t0,
    width: W,
    height: H,
    fps: MOMENT_GIF_FPS,
  }
}
