import {
  ATMOSPHERE_TIMING,
  isLivingAtmosphere,
  parseAtmosphere,
  type AtmosphereId,
  type LivingAtmosphereId,
} from '@/lib/atmosphere'
import type { MargoMoment, MargoMomentLine } from '@/lib/moment/types'
import { momentHasPlayableSnippet } from '@/lib/moment-export/timeline/build-moment-timeline'

export const VISUAL_LOOP_MIN_SEC = 8
export const VISUAL_LOOP_MAX_SEC = 15

/** Shown on enabled video rows for silent visual-loop exports. */
export const MOMENT_VISUAL_LOOP_LABEL = 'Visual loop · No audio'

function effectLoopDurationSec(id: LivingAtmosphereId): number {
  if (id === 'weight') return ATMOSPHERE_TIMING.weightFloor
  if (id === 'pulse') return ATMOSPHERE_TIMING.pulse
  if (id === 'drift') return ATMOSPHERE_TIMING.drift
  return ATMOSPHERE_TIMING.breath
}

/** Fixed silent export length — ~2× effect loop, clamped 8–15s. */
export function resolveVisualLoopDurationSec(atmosphereId: AtmosphereId): number {
  if (!isLivingAtmosphere(atmosphereId)) return VISUAL_LOOP_MIN_SEC
  const doubled = effectLoopDurationSec(atmosphereId) * 2
  return Math.min(VISUAL_LOOP_MAX_SEC, Math.max(VISUAL_LOOP_MIN_SEC, doubled))
}

/** Externally-linked line — no Margo catalog song id or hosted audio. */
export function momentLineIsExternal(line: MargoMomentLine): boolean {
  if (line.songId || line.audioUrl) return false
  if (line.source === 'catalog') return false
  if (line.source === 'external' || line.source === 'freeform') return true
  return !line.songId && !line.audioUrl
}

/**
 * Silent visual-loop export — external songs with a living Effect only.
 * Catalog audio-synced path stays separate and unchanged.
 */
export function momentUsesVisualLoopExport(moment: MargoMoment): boolean {
  if (moment.lines.length !== 1) return false
  if (momentHasPlayableSnippet(moment)) return false
  const atmosphereId = parseAtmosphere(moment.exportAtmosphereId ?? null)
  if (!isLivingAtmosphere(atmosphereId)) return false
  return momentLineIsExternal(moment.lines[0])
}

export function canEncodeMomentVideo(moment: MargoMoment): boolean {
  return momentHasPlayableSnippet(moment) || momentUsesVisualLoopExport(moment)
}
