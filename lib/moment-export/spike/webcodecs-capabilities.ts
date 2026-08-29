/**
 * Runtime WebCodecs + Mediabunny codec probes for the export spike.
 */

import {
  getEncodableAudioCodecs,
  getEncodableVideoCodecs,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
} from 'mediabunny'

export interface WebCodecsCapabilityReport {
  userAgent: string
  platform: string
  videoEncoder: boolean
  audioEncoder: boolean
  videoFrame: boolean
  audioData: boolean
  encodableVideo: string[]
  encodableAudio: string[]
  preferredVideoCodec: string | null
  preferredAudioCodec: string | null
  h264AacMp4Viable: boolean
  notes: string[]
}

export async function probeWebCodecsCapabilities(): Promise<WebCodecsCapabilityReport> {
  const notes: string[] = []

  const videoEncoder = typeof VideoEncoder !== 'undefined'
  const audioEncoder = typeof AudioEncoder !== 'undefined'
  const videoFrame = typeof VideoFrame !== 'undefined'
  const audioData = typeof AudioData !== 'undefined'

  if (!videoEncoder) notes.push('VideoEncoder unavailable')
  if (!audioEncoder) notes.push('AudioEncoder unavailable — Safari <26 or Firefox <130')
  if (videoEncoder && !videoFrame) notes.push('VideoFrame unavailable')

  let encodableVideo: string[] = []
  let encodableAudio: string[] = []
  let preferredVideoCodec: string | null = null
  let preferredAudioCodec: string | null = null

  try {
    encodableVideo = await getEncodableVideoCodecs(['avc', 'vp9', 'av1'])
    encodableAudio = await getEncodableAudioCodecs(['aac', 'opus'])
    preferredVideoCodec = await getFirstEncodableVideoCodec(['avc', 'vp9'])
    preferredAudioCodec = await getFirstEncodableAudioCodec(['aac', 'opus'])
  } catch (e) {
    notes.push(`Codec probe failed: ${(e as Error).message}`)
  }

  const h264 = encodableVideo.includes('avc')
  const aac = encodableAudio.includes('aac')
  const h264AacMp4Viable = h264 && aac && videoEncoder && audioEncoder

  if (h264 && !aac) {
    notes.push('Native AAC unavailable — spike uses @mediabunny/aac-encoder polyfill when encoding')
  }
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && aac) {
    notes.push('iOS Safari 26+ has known WebKit AAC descriptor bugs — Mediabunny 1.55+ includes workaround; Opus is safer')
  }

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    videoEncoder,
    audioEncoder,
    videoFrame,
    audioData,
    encodableVideo,
    encodableAudio,
    preferredVideoCodec,
    preferredAudioCodec,
    h264AacMp4Viable,
    notes,
  }
}

export function canShareVideoFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  if (typeof navigator.canShare !== 'function') return true
  try {
    return navigator.canShare({
      files: [new File([], 'probe.mp4', { type: 'video/mp4' })],
    })
  } catch {
    return false
  }
}
