import type { AtmosphereId } from '@/lib/atmosphere'
import { ATMOSPHERE_OPTIONS } from '@/lib/atmosphere'
import type { MomentShapeId } from '@/lib/moment/types'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'

const COLOR_CYCLE: StageCardThemeId[] = ['gold', 'blush', 'sage', 'dusk']

const EFFECT_CYCLE: AtmosphereId[] = ATMOSPHERE_OPTIONS.map((o) => o.id)

const FORMAT_CYCLE: MomentShapeId[] = ['square', 'vertical']

export function nextCardThemeId(current: StageCardThemeId): StageCardThemeId {
  const i = COLOR_CYCLE.indexOf(current)
  return COLOR_CYCLE[(i + 1) % COLOR_CYCLE.length]
}

export function nextExportAtmosphereId(current: AtmosphereId): AtmosphereId {
  const i = EFFECT_CYCLE.indexOf(current)
  const next = EFFECT_CYCLE[(i + 1) % EFFECT_CYCLE.length]
  return next ?? 'still'
}

export function nextMomentShapeId(current: MomentShapeId): MomentShapeId {
  const i = FORMAT_CYCLE.indexOf(current === 'wide' ? 'square' : current)
  return FORMAT_CYCLE[(i + 1) % FORMAT_CYCLE.length]
}

export function cardThemePillLabel(id: StageCardThemeId): string {
  return id.charAt(0).toUpperCase() + id.slice(1)
}

export function atmospherePillLabel(id: AtmosphereId): string {
  return ATMOSPHERE_OPTIONS.find((o) => o.id === id)?.label ?? id
}

export function shapePillLabel(id: MomentShapeId): string {
  return id === 'vertical' ? 'Story 9:16' : 'Square 1:1'
}
