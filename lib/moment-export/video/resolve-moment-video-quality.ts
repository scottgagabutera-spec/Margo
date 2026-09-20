import type { QuantitativeQualityOptions } from 'mediabunny'

/** Nominal target for the reference square (1080×1080) — crisp on WhatsApp. */
export const MOMENT_VIDEO_SOCIAL_TARGET_BYTES = 15 * 1024 * 1024

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
 * YouTube-recommended 1080p30 SDR upload bitrate (1080×1920 Shorts has the same pixel count).
 * @see https://support.google.com/youtube/answer/1722171
 */
export const MOMENT_SHORTS_PLATFORM_VIDEO_BITRATE = 8_000_000

/** Headroom for lyric text/gradients and WebCodecs under-spend (YouTube 1080p60 tier = 12 Mbps). */
export const MOMENT_SHORTS_PLATFORM_VIDEO_MAX_BITRATE = 12_000_000

/** Platform profile file ceiling — not WhatsApp-limited (YouTube accepts up to 256 GB). */
export const MOMENT_SHORTS_PLATFORM_MAX_FILE_BYTES = 48 * 1024 * 1024

/** WebCodecs VBR on lyric cards often lands ~75% of the capped bitrate — compensate in the cap. */
const MOMENT_SHORTS_ENCODER_SPEND_FACTOR = 0.75

export type MomentVideoExportFormat = 'feed' | 'shorts'

export interface MomentVideoQualityPreset {
  video: QuantitativeQualityOptions
  audioBitrate: number
  pixelScale: number
  fileBudgetBytes: number
  profile: 'feed-social' | 'shorts-platform'
}

export interface MomentVideoQualityInput {
  durationSec: number
  hasAudio: boolean
  width: number
  height: number
  format: MomentVideoExportFormat
}

/**
 * Feed/square: quantizer-led VBR capped for WhatsApp (~15 MB).
 * Shorts/vertical: YouTube-reference platform profile (~8 Mbps @ 30 fps), decoupled from WhatsApp.
 */
export function resolveMomentVideoQualityPreset({
  durationSec,
  hasAudio,
  width,
  height,
  format,
}: MomentVideoQualityInput): MomentVideoQualityPreset {
  const safeDurationSec = Math.max(1, durationSec)
  const safeWidth = Math.max(1, Math.round(width))
  const safeHeight = Math.max(1, Math.round(height))
  const pixels = safeWidth * safeHeight
  const pixelScale = pixels / REFERENCE_PIXELS

  const audioBitrate = hasAudio ? MOMENT_VIDEO_SOCIAL_AUDIO_BITRATE : 0
  const audioBytes = (audioBitrate * safeDurationSec) / 8

  if (format !== 'shorts') {
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
      profile: 'feed-social',
    }
  }

  const targetVideoBitrate = MOMENT_SHORTS_PLATFORM_VIDEO_BITRATE
  const compensatedBitrate = Math.floor(targetVideoBitrate / MOMENT_SHORTS_ENCODER_SPEND_FACTOR)
  const requiredFileBytes = audioBytes + (compensatedBitrate * safeDurationSec) / 8
  const fileBudgetBytes = Math.min(
    MOMENT_SHORTS_PLATFORM_MAX_FILE_BYTES,
    Math.max(requiredFileBytes, audioBytes + 512 * 1024),
  )
  const videoBudgetBytes = Math.max(512 * 1024, fileBudgetBytes - audioBytes)
  const budgetCapBitrate = Math.floor((videoBudgetBytes * 8) / safeDurationSec)
  const cappedVideoBitrate = Math.min(
    MOMENT_SHORTS_PLATFORM_VIDEO_MAX_BITRATE,
    Math.max(REFERENCE_MIN_VIDEO_BITRATE, Math.min(compensatedBitrate, budgetCapBitrate)),
  )

  return {
    video: {
      bitrate: cappedVideoBitrate,
      bitrateMode: 'variable',
    },
    audioBitrate,
    pixelScale,
    fileBudgetBytes,
    profile: 'shorts-platform',
  }
}
