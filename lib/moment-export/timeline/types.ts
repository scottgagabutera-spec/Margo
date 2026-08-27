/** Serializable timeline for a single-line Margo Moment video export. */

export interface MomentWordTiming {
  word: string
  /** When this word begins appearing */
  startSec: number
  /** When fade-in completes */
  revealEndSec: number
  /** Subtle emphasis (scale/ink) on key words */
  emphasis: boolean
}

export interface MomentTimeline {
  durationSec: number
  fps: number
  words: MomentWordTiming[]
  /** Background + panel fade-in complete */
  bgFadeEndSec: number
  metaRevealStartSec: number
  metaRevealDurationSec: number
  vibeRevealStartSec: number
  vibeRevealDurationSec: number
  endFadeStartSec: number
  endFadeDurationSec: number
  /** Gentle artwork scale over the clip */
  artworkScaleStart: number
  artworkScaleEnd: number
}
