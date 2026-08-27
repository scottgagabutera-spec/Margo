/**
 * Spike MP4 encoder — Canvas frames + trimmed audio → H.264/AAC MP4 via Mediabunny.
 */

import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  canEncodeAudio,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  Quality,
} from 'mediabunny'
import { registerAacEncoder } from '@mediabunny/aac-encoder'
import { fetchAndDecodeAudioSnippet } from '@/lib/moment-export/spike/audio-trim'
import {
  createSpikeFrameAssets,
  renderSpikeFrame,
  resolveSpikeCardLayout,
} from '@/lib/moment-export/spike/render-spike-frame'
import {
  SPIKE_DURATION_SEC,
  SPIKE_FPS,
  SPIKE_VIDEO_HEIGHT,
  SPIKE_VIDEO_WIDTH,
  spikeAudioFetchUrl,
  type SpikeMoment,
} from '@/lib/moment-export/spike/spike-moment'

export interface EncodeSpikeResult {
  blob: Blob
  durationSec: number
  frameCount: number
  encodeMs: number
  fileSizeBytes: number
  videoCodec: string
  audioCodec: string
  audioFetchMs: number
  frameRenderMs: number
  muxMs: number
}

export interface EncodeSpikeProgress {
  phase: 'audio' | 'frames' | 'finalize'
  frame?: number
  frameCount?: number
}

export async function encodeSpikeMomentMp4(
  moment: SpikeMoment,
  onProgress?: (p: EncodeSpikeProgress) => void,
  options?: { durationSec?: number },
): Promise<EncodeSpikeResult> {
  const t0 = performance.now()

  if (!(await canEncodeAudio('aac'))) {
    registerAacEncoder()
  }

  const videoCodec = await getFirstEncodableVideoCodec(['avc', 'vp9'])
  if (!videoCodec) throw new Error('No encodable video codec (need avc or vp9)')

  let audioCodec = await getFirstEncodableAudioCodec(['aac'])
  if (!audioCodec) {
    throw new Error('AAC unavailable even after polyfill — cannot mux MP4 with audio')
  }

  const assets = await createSpikeFrameAssets(moment)
  const layout = resolveSpikeCardLayout(moment, assets)

  onProgress?.({ phase: 'audio' })
  const audioT0 = performance.now()
  const audioUrl = spikeAudioFetchUrl(moment)
  const audioBuffer = await fetchAndDecodeAudioSnippet(
    audioUrl,
    moment.snippetStart,
    moment.snippetEnd,
  )
  const audioFetchMs = performance.now() - audioT0

  const durationSec = Math.min(
    options?.durationSec ?? SPIKE_DURATION_SEC,
    audioBuffer.duration,
    moment.snippetEnd - moment.snippetStart,
  )
  const frameCount = Math.max(1, Math.round(durationSec * SPIKE_FPS))
  const frameDuration = 1 / SPIKE_FPS

  const canvas = document.createElement('canvas')
  canvas.width = SPIKE_VIDEO_WIDTH
  canvas.height = SPIKE_VIDEO_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d unavailable')

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  })

  const videoSource = new CanvasSource(canvas, {
    codec: videoCodec,
    quality: new Quality({ bitrate: videoCodec === 'avc' ? 4_500_000 : 3_000_000 }),
  })

  const audioSource = new AudioBufferSource({
    codec: audioCodec,
    quality: new Quality({ bitrate: 128_000 }),
  })

  output.addVideoTrack(videoSource, { frameRate: SPIKE_FPS })
  output.addAudioTrack(audioSource)

  await output.start()

  // Trim audio buffer to exact export duration
  const sampleRate = audioBuffer.sampleRate
  const exportSamples = Math.min(
    audioBuffer.length,
    Math.ceil(durationSec * sampleRate),
  )
  const trimCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    exportSamples,
    sampleRate,
  )
  const exportAudio = trimCtx.createBuffer(
    audioBuffer.numberOfChannels,
    exportSamples,
    sampleRate,
  )
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    exportAudio.getChannelData(ch).set(
      audioBuffer.getChannelData(ch).subarray(0, exportSamples),
    )
  }

  await audioSource.add(exportAudio)

  const frameT0 = performance.now()
  onProgress?.({ phase: 'frames', frame: 0, frameCount })

  for (let frame = 0; frame < frameCount; frame++) {
    const timeSec = frame / SPIKE_FPS
    renderSpikeFrame(ctx, moment, assets, layout, timeSec)
    await videoSource.add(timeSec, frameDuration)
    if (frame % 10 === 0) {
      onProgress?.({ phase: 'frames', frame, frameCount })
    }
  }
  const frameRenderMs = performance.now() - frameT0

  onProgress?.({ phase: 'finalize' })
  const muxT0 = performance.now()
  await output.finalize()
  const muxMs = performance.now() - muxT0

  const buffer = output.target.buffer
  if (!buffer) throw new Error('MP4 buffer missing after finalize')

  const blob = new Blob([buffer], { type: 'video/mp4' })
  const encodeMs = performance.now() - t0

  return {
    blob,
    durationSec,
    frameCount,
    encodeMs,
    fileSizeBytes: blob.size,
    videoCodec,
    audioCodec,
    audioFetchMs,
    frameRenderMs,
    muxMs,
  }
}
