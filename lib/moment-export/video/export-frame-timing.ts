import {
  MOMENT_EXPORT_INTRO_HOLD_SEC,
  MOMENT_VIDEO_POSTER_HOLD_SEC,
} from '@/lib/moment-export/video/constants'

/** Total export duration: intro poster + snippet animation + final poster hold. */
export function exportTotalDurationSec(audioDurationSec: number): number {
  return MOMENT_EXPORT_INTRO_HOLD_SEC + audioDurationSec + MOMENT_VIDEO_POSTER_HOLD_SEC
}

/** Render time for one export frame — intro/final holds use the completed card pose. */
export function resolveExportRenderTimeSec(
  frame: number,
  fps: number,
  audioDurationSec: number,
): number {
  const posterRenderSec = Math.max(0, audioDurationSec - 1 / fps)
  const introFrames = Math.round(MOMENT_EXPORT_INTRO_HOLD_SEC * fps)

  if (frame < introFrames) {
    return posterRenderSec
  }

  const animTimeSec = (frame - introFrames) / fps
  return Math.min(animTimeSec, posterRenderSec)
}
