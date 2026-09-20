import type { QuantitativeQualityOptions } from 'mediabunny'

/** Stay under WhatsApp's ~16 MB inline cap so the app skips its own recompression pass. */
export const MOMENT_VIDEO_SOCIAL_TARGET_BYTES = 15 * 1024 * 1024

/**
 * AVC quantizer (Mediabunny ≈ FFmpeg CRF). Lower = higher quality.
 * 18–20 keeps gradients/text clean while the bitrate cap controls file size.
 */
export const MOMENT_VIDEO_SOCIAL_QUANTIZER = 19

/** AAC-LC stereo — enough for short lyric clips; saves budget for video. */
export const MOMENT_VIDEO_SOCIAL_AUDIO_BITRATE = 128_000

const MIN_VIDEO_BITRATE = 2_000_000
const MAX_VIDEO_BITRATE = 12_000_000

export interface MomentVideoQualityPreset {
  video: QuantitativeQualityOptions
  audioBitrate: number
}

/**
 * Duration-aware H.264 preset sized for WhatsApp / Instagram DM inline sharing.
 * Quantizer drives quality; max bitrate scales down for longer clips.
 */
export function resolveMomentVideoQualityPreset(
  durationSec: number,
  hasAudio: boolean,
): MomentVideoQualityPreset {
  const safeDurationSec = Math.max(1, durationSec)
  const audioBitrate = hasAudio ? MOMENT_VIDEO_SOCIAL_AUDIO_BITRATE : 0
  const audioBytes = (audioBitrate * safeDurationSec) / 8
  const videoBudgetBytes = Math.max(
    512 * 1024,
    MOMENT_VIDEO_SOCIAL_TARGET_BYTES - audioBytes,
  )
  const targetVideoBitrate = Math.floor((videoBudgetBytes * 8) / safeDurationSec)
  const cappedVideoBitrate = Math.min(
    MAX_VIDEO_BITRATE,
    Math.max(MIN_VIDEO_BITRATE, targetVideoBitrate),
  )

  return {
    video: {
      quantizer: MOMENT_VIDEO_SOCIAL_QUANTIZER,
      bitrate: cappedVideoBitrate,
      bitrateMode: 'variable',
    },
    audioBitrate,
  }
}
