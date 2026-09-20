import { parseAtmosphere } from '@/lib/atmosphere'
import type { MargoMoment } from '@/lib/moment/types'
import {
  bindStageVideoExportCanvas,
  bindStageVideoRenderCanvas,
  downscaleVideoFrameToEncodeCanvas,
} from '@/lib/moment-export/export-canvas-quality'
import {
  canEncodeMomentVideo,
  momentUsesVisualLoopExport,
  resolveVisualLoopDurationSec,
} from '@/lib/moment-export/visual-loop-export'
import { buildMomentTimeline } from '@/lib/moment-export/timeline/build-moment-timeline'
import {
  buildCanvasTextMeasure,
  resolveStageCardLayout,
  STAGE_CARD_EXPORT_WIDTH,
  resolveGeistFontFamily,
  waitForExportFonts,
  type ResolvedStageCardLayout,
} from '@/lib/moment-export/layout'
import { renderMomentFrame } from '@/lib/moment-export/video/render-moment-frame'
import { loadMomentArtwork } from '@/lib/moment-export/video/load-artwork'
import {
  fetchAndDecodeAudioSnippet,
  truncateAudioBuffer,
  prependSilence,
} from '@/lib/moment-export/video/fetch-audio-snippet'
import { ensureAacEncoderRegistered } from '@/lib/moment-export/video/capabilities'
import {
  MOMENT_VIDEO_FPS,
  MOMENT_VIDEO_MAX_DURATION_SEC,
  MOMENT_EXPORT_INTRO_HOLD_SEC,
  MOMENT_SHORTS_VIDEO_RENDER_SCALE,
  MOMENT_SHORTS_KEY_FRAME_INTERVAL_SEC,
} from '@/lib/moment-export/video/constants'
import { resolveMomentVideoQualityPreset } from '@/lib/moment-export/video/resolve-moment-video-quality'
import {
  exportTotalDurationSec,
  completedCardRenderTimeSec,
  resolveExportRenderTimeSec,
} from '@/lib/moment-export/video/export-frame-timing'

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
  /** True when export is a silent visual loop (no audio track). */
  silent?: boolean
}

interface VideoFramePipeline {
  renderCanvas: HTMLCanvasElement
  renderCtx: CanvasRenderingContext2D
  encodeCanvas: HTMLCanvasElement
  encodeCtx: CanvasRenderingContext2D
  renderLayout: ResolvedStageCardLayout
  encodeWidth: number
  encodeHeight: number
  usesSupersampling: boolean
}

function ensureEvenHeight(layout: ResolvedStageCardLayout): ResolvedStageCardLayout {
  return layout.outputHeight % 2 === 0
    ? layout
    : { ...layout, outputHeight: layout.outputHeight + 1 }
}

function scaleLayoutDown(layout: ResolvedStageCardLayout, scale: number): ResolvedStageCardLayout {
  const factor = 1 / scale
  return {
    ...layout,
    outputWidth: Math.round(layout.outputWidth * factor),
    outputHeight: Math.round(layout.outputHeight * factor),
  }
}

function createVideoFramePipeline(isVertical: boolean, layout: ResolvedStageCardLayout): VideoFramePipeline {
  const renderLayout = ensureEvenHeight(layout)
  if (!isVertical) {
    const canvas = document.createElement('canvas')
    const ctx = bindStageVideoExportCanvas(canvas, renderLayout.outputWidth, renderLayout.outputHeight)
    return {
      renderCanvas: canvas,
      renderCtx: ctx,
      encodeCanvas: canvas,
      encodeCtx: ctx,
      renderLayout,
      encodeWidth: renderLayout.outputWidth,
      encodeHeight: renderLayout.outputHeight,
      usesSupersampling: false,
    }
  }

  const encodeLayout = ensureEvenHeight(
    scaleLayoutDown(renderLayout, MOMENT_SHORTS_VIDEO_RENDER_SCALE),
  )
  const renderCanvas = document.createElement('canvas')
  const renderCtx = bindStageVideoRenderCanvas(
    renderCanvas,
    renderLayout.outputWidth,
    renderLayout.outputHeight,
  )
  const encodeCanvas = document.createElement('canvas')
  const encodeCtx = bindStageVideoExportCanvas(
    encodeCanvas,
    encodeLayout.outputWidth,
    encodeLayout.outputHeight,
  )
  return {
    renderCanvas,
    renderCtx,
    encodeCanvas,
    encodeCtx,
    renderLayout,
    encodeWidth: encodeLayout.outputWidth,
    encodeHeight: encodeLayout.outputHeight,
    usesSupersampling: true,
  }
}

function commitVideoFrame(pipeline: VideoFramePipeline): void {
  if (!pipeline.usesSupersampling) return
  downscaleVideoFrameToEncodeCanvas(
    pipeline.renderCanvas,
    pipeline.encodeCtx,
    pipeline.encodeWidth,
    pipeline.encodeHeight,
  )
}

export async function encodeMargoMomentMp4(
  moment: MargoMoment,
  onProgress?: (p: EncodeMomentProgress) => void,
  signal?: AbortSignal,
): Promise<EncodeMomentResult> {
  if (!canEncodeMomentVideo(moment)) {
    throw new Error('This Moment needs a playable audio snippet for video export')
  }

  const line = moment.lines[0]
  const t0 = performance.now()
  const visualLoop = momentUsesVisualLoopExport(moment)

  onProgress?.({ phase: 'prepare' })

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

  if (!visualLoop) {
    await ensureAacEncoderRegistered()
  }

  type AudioCodecName = NonNullable<Awaited<ReturnType<typeof getFirstEncodableAudioCodec>>>
  let audioCodecName: AudioCodecName | 'none' = 'none'
  if (!visualLoop) {
    const audioCodec = await getFirstEncodableAudioCodec(['aac'])
    if (!audioCodec) throw new Error('AAC audio encoding is not available')
    audioCodecName = audioCodec
  }

  await waitForExportFonts()
  const geistFamily = resolveGeistFontFamily()
  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')
  if (!measureCtx) throw new Error('Canvas is not available')
  const measure = buildCanvasTextMeasure(measureCtx)

  const isVertical = moment.shapeId === 'vertical'
  const layoutOutputWidthPx = isVertical
    ? STAGE_CARD_EXPORT_WIDTH * MOMENT_SHORTS_VIDEO_RENDER_SCALE
    : STAGE_CARD_EXPORT_WIDTH
  const layout = resolveStageCardLayout({
    lyric: line.lyric,
    songTitle: line.songTitle,
    artistName: line.artistName,
    artworkUrl: line.artworkUrl,
    vibeLabel: moment.vibeLabel,
    themeId: moment.themeId,
    exportAtmosphereId: moment.exportAtmosphereId,
    outputWidthPx: layoutOutputWidthPx,
    includeVibePill: !!moment.vibeLabel?.trim(),
    format: isVertical ? 'shorts' : 'feed',
  }, measure, geistFamily)

  const pipeline = createVideoFramePipeline(isVertical, layout)
  const { encodeCanvas, encodeWidth, encodeHeight } = pipeline

  let totalDurationSec: number
  let encodeHasAudio: boolean
  let frameCount: number
  let exportTimeline: ReturnType<typeof buildMomentTimeline>
  let posterRenderSec: number
  let artworkImage: Awaited<ReturnType<typeof loadMomentArtwork>>

  if (visualLoop) {
    const loopDurationSec = resolveVisualLoopDurationSec(parseAtmosphere(moment.exportAtmosphereId ?? null))
    exportTimeline = buildMomentTimeline(moment, loopDurationSec)
    posterRenderSec = completedCardRenderTimeSec(exportTimeline)
    totalDurationSec = loopDurationSec
    encodeHasAudio = false
    frameCount = Math.max(1, Math.round(totalDurationSec * MOMENT_VIDEO_FPS))
    artworkImage = await loadMomentArtwork(line.artworkUrl)
  } else {
    onProgress?.({ phase: 'audio' })
    const [art, audioBuffer] = await Promise.all([
      loadMomentArtwork(line.artworkUrl),
      fetchAndDecodeAudioSnippet(
        line.audioUrl!,
        line.snippetStart!,
        line.snippetEnd!,
        signal,
      ),
    ])
    artworkImage = art
    const audioDurationSec = Math.min(audioBuffer.duration, MOMENT_VIDEO_MAX_DURATION_SEC)
    exportTimeline = buildMomentTimeline(moment, audioDurationSec)
    posterRenderSec = completedCardRenderTimeSec(exportTimeline)
    totalDurationSec = exportTotalDurationSec(audioDurationSec)
    encodeHasAudio = true
    frameCount = Math.max(1, Math.round(totalDurationSec * MOMENT_VIDEO_FPS))

    const qualityPreset = resolveMomentVideoQualityPreset({
      durationSec: totalDurationSec,
      hasAudio: true,
      width: encodeWidth,
      height: encodeHeight,
      format: isVertical ? 'shorts' : 'feed',
    })
    const exportAudio = prependSilence(
      truncateAudioBuffer(audioBuffer, audioDurationSec),
      MOMENT_EXPORT_INTRO_HOLD_SEC,
    )

    const frameDuration = 1 / MOMENT_VIDEO_FPS
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new BufferTarget(),
    })

    const videoSource = new CanvasSource(encodeCanvas, {
      codec: videoCodec,
      quality: new Quality(qualityPreset.video),
      ...(isVertical ? { keyFrameInterval: MOMENT_SHORTS_KEY_FRAME_INTERVAL_SEC } : {}),
    })
    const audioSource = new AudioBufferSource({
      codec: audioCodecName as AudioCodecName,
      quality: new Quality({ bitrate: qualityPreset.audioBitrate }),
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
      const renderTimeSec = resolveExportRenderTimeSec(frame, MOMENT_VIDEO_FPS, posterRenderSec)
      renderMomentFrame(
        pipeline.renderCtx,
        pipeline.renderLayout,
        exportTimeline,
        assets,
        renderTimeSec,
        moment.exportAtmosphereId,
      )
      commitVideoFrame(pipeline)
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
      durationSec: totalDurationSec,
      frameCount,
      fileSizeBytes: blob.size,
      encodeMs: performance.now() - t0,
      videoCodec,
      audioCodec: audioCodecName,
      width: encodeWidth,
      height: encodeHeight,
      silent: false,
    }
  }

  const qualityPreset = resolveMomentVideoQualityPreset({
    durationSec: totalDurationSec,
    hasAudio: encodeHasAudio,
    width: encodeWidth,
    height: encodeHeight,
    format: isVertical ? 'shorts' : 'feed',
  })
  const frameDuration = 1 / MOMENT_VIDEO_FPS
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  })

  const videoSource = new CanvasSource(encodeCanvas, {
    codec: videoCodec,
    quality: new Quality(qualityPreset.video),
    ...(isVertical ? { keyFrameInterval: MOMENT_SHORTS_KEY_FRAME_INTERVAL_SEC } : {}),
  })

  output.addVideoTrack(videoSource, { frameRate: MOMENT_VIDEO_FPS })
  await output.start()

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  onProgress?.({ phase: 'frames', frame: 0, frameCount })
  const assets = { artworkImage }

  for (let frame = 0; frame < frameCount; frame++) {
    if (signal?.aborted) {
      await output.cancel()
      throw new DOMException('Aborted', 'AbortError')
    }
    const clockSec = frame / MOMENT_VIDEO_FPS
    const contentSec = Math.min(clockSec, posterRenderSec)
    renderMomentFrame(
      pipeline.renderCtx,
      pipeline.renderLayout,
      exportTimeline,
      assets,
      contentSec,
      moment.exportAtmosphereId,
      { atmosphereTimeSec: clockSec },
    )
    commitVideoFrame(pipeline)
    await videoSource.add(clockSec, frameDuration)
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
    durationSec: totalDurationSec,
    frameCount,
    fileSizeBytes: blob.size,
    encodeMs: performance.now() - t0,
    videoCodec,
    audioCodec: 'none',
    width: encodeWidth,
    height: encodeHeight,
    silent: true,
  }
}
