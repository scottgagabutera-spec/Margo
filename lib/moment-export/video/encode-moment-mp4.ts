import type { MargoMoment } from '@/lib/moment/types'
import { buildMomentTimeline, momentHasPlayableSnippet } from '@/lib/moment-export/timeline/build-moment-timeline'
import {
  buildCanvasTextMeasure,
  resolveStageCardLayout,
  STAGE_CARD_EXPORT_WIDTH,
  resolveGeistFontFamily,
  waitForExportFonts,
} from '@/lib/moment-export/layout'
import { renderMomentFrame } from '@/lib/moment-export/video/render-moment-frame'
import { loadMomentArtwork } from '@/lib/moment-export/video/load-artwork'
import {
  fetchAndDecodeAudioSnippet,
  truncateAudioBuffer,
} from '@/lib/moment-export/video/fetch-audio-snippet'
import { ensureAacEncoderRegistered } from '@/lib/moment-export/video/capabilities'
import { MOMENT_VIDEO_FPS } from '@/lib/moment-export/video/constants'

export interface EncodeMomentProgress {
  phase: 'prepare' | 'audio' | 'frames' | 'finalize'
  frame?: number
  frameCount?: number
}

export interface EncodeMomentResult {
  blob: Blob
  durationSec: number
  frameCount: number
  fileSizeBytes: number
  encodeMs: number
  videoCodec: string
  audioCodec: string
  width: number
  height: number
}

export async function encodeMargoMomentMp4(
  moment: MargoMoment,
  onProgress?: (p: EncodeMomentProgress) => void,
  signal?: AbortSignal,
): Promise<EncodeMomentResult> {
  if (!momentHasPlayableSnippet(moment)) {
    throw new Error('This Moment needs a playable audio snippet for video export')
  }

  const line = moment.lines[0]
  const t0 = performance.now()

  onProgress?.({ phase: 'prepare' })
  await ensureAacEncoderRegistered()

  const {
    Output,
    Mp4OutputFormat,
    BufferTarget,
    CanvasSource,
    AudioBufferSource,
    Quality,
    getFirstEncodableVideoCodec,
    getFirstEncodableAudioCodec,
  } = await import('mediabunny')

  const videoCodec = await getFirstEncodableVideoCodec(['avc'])
  if (!videoCodec) throw new Error('H.264 video encoding is not available')

  const audioCodec = await getFirstEncodableAudioCodec(['aac'])
  if (!audioCodec) throw new Error('AAC audio encoding is not available')

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
    outputWidthPx: STAGE_CARD_EXPORT_WIDTH,
    includeVibePill: !!moment.vibeLabel?.trim(),
  }, measure, geistFamily)

  const timeline = buildMomentTimeline(moment)
  const artworkImage = await loadMomentArtwork(line.artworkUrl)

  const exportLayout = layout.outputHeight % 2 === 0
    ? layout
    : { ...layout, outputHeight: layout.outputHeight + 1 }

  onProgress?.({ phase: 'audio' })
  const audioBuffer = await fetchAndDecodeAudioSnippet(
    line.audioUrl!,
    line.snippetStart!,
    line.snippetEnd!,
    signal,
  )
  const exportAudio = truncateAudioBuffer(audioBuffer, timeline.durationSec)

  const frameCount = Math.max(1, Math.round(timeline.durationSec * MOMENT_VIDEO_FPS))
  const frameDuration = 1 / MOMENT_VIDEO_FPS
  const W = exportLayout.outputWidth
  const H = exportLayout.outputHeight

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  })

  const videoSource = new CanvasSource(canvas, {
    codec: videoCodec,
    quality: new Quality({ bitrate: 4_200_000 }),
  })
  const audioSource = new AudioBufferSource({
    codec: audioCodec,
    quality: new Quality({ bitrate: 128_000 }),
  })

  output.addVideoTrack(videoSource, { frameRate: MOMENT_VIDEO_FPS })
  output.addAudioTrack(audioSource)
  await output.start()

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  await audioSource.add(exportAudio)

  onProgress?.({ phase: 'frames', frame: 0, frameCount })
  const assets = { artworkImage }

  for (let frame = 0; frame < frameCount; frame++) {
    if (signal?.aborted) {
      await output.cancel()
      throw new DOMException('Aborted', 'AbortError')
    }
    const timeSec = frame / MOMENT_VIDEO_FPS
    renderMomentFrame(ctx, exportLayout, timeline, assets, timeSec)
    await videoSource.add(timeSec, frameDuration)
    if (frame % 30 === 0) {
      onProgress?.({ phase: 'frames', frame, frameCount })
    }
  }

  onProgress?.({ phase: 'finalize' })
  await output.finalize()

  const buffer = output.target.buffer
  if (!buffer) throw new Error('Video export failed')

  const blob = new Blob([buffer], { type: 'video/mp4' })
  return {
    blob,
    durationSec: timeline.durationSec,
    frameCount,
    fileSizeBytes: blob.size,
    encodeMs: performance.now() - t0,
    videoCodec,
    audioCodec,
    width: W,
    height: H,
  }
}
