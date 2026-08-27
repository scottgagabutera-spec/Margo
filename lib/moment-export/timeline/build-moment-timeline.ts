import type { MargoMoment } from '@/lib/moment/types'
import { clamp01 } from '@/lib/moment-export/timeline/interpolate'
import type { MomentTimeline, MomentWordTiming } from '@/lib/moment-export/timeline/types'
import { MOMENT_VIDEO_FPS, MOMENT_VIDEO_MAX_DURATION_SEC } from '@/lib/moment-export/video/constants'

function splitWords(lyric: string): string[] {
  return lyric.trim().split(/\s+/).filter(Boolean)
}

/** Natural word start times — eased distribution, longer pause after punctuation. */
function buildWordTimings(
  words: string[],
  revealStart: number,
  revealSpan: number,
  durationSec: number,
): MomentWordTiming[] {
  if (words.length === 0) return []

  const weights: number[] = words.map((w, i) => {
    let weight = 1
    if (/[,.!?;:]$/.test(w)) weight += 0.45
    if (i === words.length - 1) weight += 0.35
    if (i === words.length - 2 && words.length > 3) weight += 0.2
    return weight
  })
  const totalWeight = weights.reduce((s, w) => s + w, 0)

  const wordAnim = Math.min(0.32, revealSpan / Math.max(words.length, 4))
  let cursor = revealStart
  const timings: MomentWordTiming[] = []

  for (let i = 0; i < words.length; i++) {
    const slot = (weights[i] / totalWeight) * revealSpan
    const startSec = cursor
    const revealEndSec = Math.min(durationSec, startSec + wordAnim)
    const emphasis = i >= words.length - 2 && words.length >= 4
    timings.push({
      word: words[i],
      startSec,
      revealEndSec,
      emphasis,
    })
    cursor += slot
  }

  return timings
}

export function snippetDurationSec(moment: MargoMoment): number {
  const line = moment.lines[0]
  if (line?.snippetStart == null || line?.snippetEnd == null) return MOMENT_VIDEO_MAX_DURATION_SEC
  const span = (line.snippetEnd ?? 0) - (line.snippetStart ?? 0)
  if (span <= 0) return MOMENT_VIDEO_MAX_DURATION_SEC
  return Math.min(MOMENT_VIDEO_MAX_DURATION_SEC, span)
}

export function momentHasPlayableSnippet(moment: MargoMoment): boolean {
  if (moment.lines.length !== 1) return false
  const line = moment.lines[0]
  return !!(
    line?.audioUrl
    && line.snippetStart != null
    && line.snippetEnd != null
    && line.snippetEnd > line.snippetStart
  )
}

/** Build a deterministic timeline from a single-line Margo Moment. */
export function buildMomentTimeline(moment: MargoMoment): MomentTimeline {
  const line = moment.lines[0]
  const lyric = (line?.lyric || '').trim()
  const words = splitWords(lyric)
  const durationSec = snippetDurationSec(moment)

  const bgFadeEndSec = Math.min(0.45, durationSec * 0.06)
  const wordRevealStart = 0.28
  const wordRevealSpan = Math.min(
    durationSec * 0.38,
    Math.max(2.2, words.length * 0.28),
  )

  const metaRevealStartSec = Math.min(
    durationSec * 0.58,
    wordRevealStart + wordRevealSpan + 0.35,
  )
  const metaRevealDurationSec = 0.55
  const vibeRevealStartSec = metaRevealStartSec + metaRevealDurationSec * 0.55
  const vibeRevealDurationSec = 0.5
  const endFadeDurationSec = Math.min(1.1, durationSec * 0.12)
  const endFadeStartSec = Math.max(
    vibeRevealStartSec + vibeRevealDurationSec,
    durationSec - endFadeDurationSec,
  )

  return {
    durationSec,
    fps: MOMENT_VIDEO_FPS,
    words: buildWordTimings(words, wordRevealStart, wordRevealSpan, durationSec),
    bgFadeEndSec,
    metaRevealStartSec,
    metaRevealDurationSec,
    vibeRevealStartSec,
    vibeRevealDurationSec,
    endFadeStartSec,
    endFadeDurationSec,
    artworkScaleStart: 1.04,
    artworkScaleEnd: 1.07,
  }
}

export function wordRevealProgress(
  timeSec: number,
  timing: MomentWordTiming,
): number {
  const span = Math.max(0.001, timing.revealEndSec - timing.startSec)
  return clamp01((timeSec - timing.startSec) / span)
}
