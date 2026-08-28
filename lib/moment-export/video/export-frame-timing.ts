import type { MomentTimeline } from '@/lib/moment-export/timeline/types'
import {
  MOMENT_EXPORT_INTRO_HOLD_SEC,
  MOMENT_VIDEO_POSTER_HOLD_SEC,
} from '@/lib/moment-export/video/constants'

/** Total export duration: intro poster + snippet animation + final poster hold. */
export function exportTotalDurationSec(audioDurationSec: number): number {
  return MOMENT_EXPORT_INTRO_HOLD_SEC + audioDurationSec + MOMENT_VIDEO_POSTER_HOLD_SEC
}

/**
 * Animation time where lyric, meta, artwork, and vibe are fully revealed.
 * Used for intro/final poster holds so thumbnails show the complete card.
 */
export function completedCardRenderTimeSec(timeline: MomentTimeline): number {
  const lastWordEnd = timeline.words.reduce(
    (max, w) => Math.max(max, w.revealEndSec),
    0,
  )
  const metaEnd = timeline.metaRevealStartSec + timeline.metaRevealDurationSec
  const artEnd = timeline.metaRevealStartSec
    + timeline.metaRevealDurationSec * 0.35
    + timeline.metaRevealDurationSec
  const vibeEnd = timeline.vibeRevealStartSec + timeline.vibeRevealDurationSec
  return Math.max(timeline.durationSec, lastWordEnd, metaEnd, artEnd, vibeEnd) + 0.02
}

/** Render time for one export frame — intro/final holds use the completed card pose. */
export function resolveExportRenderTimeSec(
  frame: number,
  fps: number,
  posterRenderSec: number,
): number {
  const introFrames = Math.round(MOMENT_EXPORT_INTRO_HOLD_SEC * fps)

  if (frame < introFrames) {
    return posterRenderSec
  }

  const animTimeSec = (frame - introFrames) / fps
  return Math.min(animTimeSec, posterRenderSec)
}
