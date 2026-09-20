import type { QuantitativeQualityOptions } from 'mediabunny'

/** Nominal target for the reference square (1080×1080) — crisp on WhatsApp. */
export const MOMENT_VIDEO_SOCIAL_TARGET_BYTES = 15 * 1024 * 1024

/** Hard ceiling — flex toward this for high-pixel Shorts, still under WhatsApp's ~16 MB cap. */
export const MOMENT_VIDEO_SOCIAL_MAX_BYTES = 16 * 1024 * 1024 - 192 * 1024

/**
 * AVC quantizer (Mediabunny ≈ FFmpeg CRF). Lower = higher quality.
 * 18–20 keeps gradients/text clean while the bitrate cap controls file size.
 */
export const MOMENT_VIDEO_SOCIAL_QUANTIZER = 19

/** AAC-LC stereo — enough for short lyric clips; saves budget for video. */
export const MOMENT_VIDEO_SOCIAL_AUDIO_BITRATE = 128_000

/** Square quality baseline — used for pixel-scale diagnostics. */
export const MOMENT_VIDEO_REFERENCE_WIDTH = 1080
export const MOMENT_VIDEO_REFERENCE_HEIGHT = 1080

const REFERENCE_PIXELS = MOMENT_VIDEO_REFERENCE_WIDTH * MOMENT_VIDEO_REFERENCE_HEIGHT

const REFERENCE_MAX_VIDEO_BITRATE = 12_000_000
const REFERENCE_MIN_VIDEO_BITRATE = 2_000_000

/**
 * Crisp feed-card bits per pixel per second (~1080×427 at quantizer 19).
 * High-pixel exports target this same density × pixel count.
 */
const CRISP_BITS_PER_PIXEL_SEC = 3.55

/** Formats at ≥ this scale vs 1080×1080 get pixel-scaled bitrate encoding. */
const HIGH_PIXEL_SCALE_THRESHOLD = 1.15

/**
 * WebCodecs VBR on lyric cards often lands ~75% of the capped bitrate — compensate
 * in the cap so delivered bppps matches feed after pixel scaling.
 */
const HIGH_PIXEL_ENCODER_SPEND_FACTOR = 0.75

export interface MomentVideoQualityPreset {
  video: QuantitativeQualityOptions
  audioBitrate: number
  pixelScale: number
  fileBudgetBytes: number
}

export interface MomentVideoQualityInput {
  durationSec: number
  hasAudio: boolean
  width: number
  height: number
}

/**
 * Duration- and resolution-aware H.264 preset for WhatsApp / Instagram DM sharing.
 * Feed cards keep quantizer-led VBR. Shorts get pixel-scaled bitrate-only VBR with a
 * flexed file budget so bits-per-pixel matches feed crispness under the 16 MB cap.
 */
export function resolveMomentVideoQualityPreset({
  durationSec,
  hasAudio,
  width,
  height,
}: MomentVideoQualityInput): MomentVideoQualityPreset {
  const safeDurationSec = Math.max(1, durationSec)
  const safeWidth = Math.max(1, Math.round(width))
  const safeHeight = Math.max(1, Math.round(height))
  const pixels = safeWidth * safeHeight
  const pixelScale = pixels / REFERENCE_PIXELS

  const audioBitrate = hasAudio ? MOMENT_VIDEO_SOCIAL_AUDIO_BITRATE : 0
  const audioBytes = (audioBitrate * safeDurationSec) / 8

  if (pixelScale < HIGH_PIXEL_SCALE_THRESHOLD) {
    const fileBudgetBytes = MOMENT_VIDEO_SOCIAL_TARGET_BYTES
    const videoBudgetBytes = Math.max(512 * 1024, fileBudgetBytes - audioBytes)
    const budgetCapBitrate = Math.floor((videoBudgetBytes * 8) / safeDurationSec)
    const cappedVideoBitrate = Math.min(
      REFERENCE_MAX_VIDEO_BITRATE,
      Math.max(REFERENCE_MIN_VIDEO_BITRATE, budgetCapBitrate),
    )

    return {
      video: {
        quantizer: MOMENT_VIDEO_SOCIAL_QUANTIZER,
        bitrate: cappedVideoBitrate,
        bitrateMode: 'variable',
      },
      audioBitrate,
      pixelScale,
      fileBudgetBytes,
    }
  }

  const idealVideoBitrate = Math.floor(CRISP_BITS_PER_PIXEL_SEC * pixels)
  const requiredFileBytes = audioBytes + (idealVideoBitrate * safeDurationSec) / 8
  const fileBudgetBytes = Math.min(
    MOMENT_VIDEO_SOCIAL_MAX_BYTES,
    Math.max(MOMENT_VIDEO_SOCIAL_TARGET_BYTES, requiredFileBytes),
  )
  const videoBudgetBytes = Math.max(512 * 1024, fileBudgetBytes - audioBytes)
  const budgetCapBitrate = Math.floor((videoBudgetBytes * 8) / safeDurationSec)
  const compensatedBitrate = Math.floor(idealVideoBitrate / HIGH_PIXEL_ENCODER_SPEND_FACTOR)
  const cappedVideoBitrate = Math.max(
    REFERENCE_MIN_VIDEO_BITRATE,
    Math.min(compensatedBitrate, budgetCapBitrate),
  )
  return {
    video: {
      bitrate: cappedVideoBitrate,
      bitrateMode: 'variable',
    },
    audioBitrate,
    pixelScale,
    fileBudgetBytes,
  }
}
