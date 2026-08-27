import {
  canEncodeAudio,
  getEncodableVideoCodecs,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
} from 'mediabunny'

export type MomentVideoCapabilityLevel =
  | 'full'
  | 'aac-polyfill'
  | 'no-webcodecs'
  | 'unsupported'

export interface MomentVideoCapability {
  level: MomentVideoCapabilityLevel
  canExport: boolean
  /** User-facing reason when canExport is false */
  reason?: string
  hasVideoEncoder: boolean
  hasAudioEncoder: boolean
  nativeAac: boolean
  encodableVideo: string[]
}

let cachedCapability: MomentVideoCapability | null = null

export async function probeMomentVideoCapability(
  forceRefresh = false,
): Promise<MomentVideoCapability> {
  if (typeof window === 'undefined') {
    return {
      level: 'unsupported',
      canExport: false,
      reason: 'Video export requires a browser',
      hasVideoEncoder: false,
      hasAudioEncoder: false,
      nativeAac: false,
      encodableVideo: [],
    }
  }

  if (cachedCapability && !forceRefresh) return cachedCapability

  const hasVideoEncoder = typeof VideoEncoder !== 'undefined'
  const hasAudioEncoder = typeof AudioEncoder !== 'undefined'

  if (!hasVideoEncoder || !hasAudioEncoder) {
    cachedCapability = {
      level: 'no-webcodecs',
      canExport: false,
      reason: 'Video export needs a newer browser (try updating Safari or Chrome)',
      hasVideoEncoder,
      hasAudioEncoder,
      nativeAac: false,
      encodableVideo: [],
    }
    return cachedCapability
  }

  let encodableVideo: string[] = []
  let nativeAac = false
  try {
    encodableVideo = await getEncodableVideoCodecs(['avc', 'vp9'])
    nativeAac = await canEncodeAudio('aac')
  } catch {
    /* probe failed */
  }

  const hasH264 = encodableVideo.includes('avc')
  if (!hasH264) {
    cachedCapability = {
      level: 'unsupported',
      canExport: false,
      reason: 'This device cannot encode video for sharing',
      hasVideoEncoder,
      hasAudioEncoder,
      nativeAac,
      encodableVideo,
    }
    return cachedCapability
  }

  if (nativeAac) {
    cachedCapability = {
      level: 'full',
      canExport: true,
      hasVideoEncoder,
      hasAudioEncoder,
      nativeAac: true,
      encodableVideo,
    }
    return cachedCapability
  }

  cachedCapability = {
    level: 'aac-polyfill',
    canExport: true,
    hasVideoEncoder,
    hasAudioEncoder,
    nativeAac: false,
    encodableVideo,
  }
  return cachedCapability
}

export async function ensureAacEncoderRegistered(): Promise<void> {
  if (typeof window === 'undefined') return
  const { canEncodeAudio } = await import('mediabunny')
  if (await canEncodeAudio('aac')) return
  const { registerAacEncoder } = await import('@mediabunny/aac-encoder')
  registerAacEncoder()
  const codec = await getFirstEncodableAudioCodec(['aac'])
  if (!codec) {
    throw new Error('AAC encoding is not available on this device')
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
