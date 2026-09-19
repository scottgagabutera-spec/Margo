import { isLivingAtmosphere, parseAtmosphere } from '@/lib/atmosphere'

/**
 * Stage Moment card color families — preview + PNG export share these tokens.
 * Mark badge variant is derived from background luminance, not ad-hoc opacity.
 *
 * When a living Effect is on, Color is not painted. The card uses the same
 * dark room as Feed / karaoke Atmosphere — Color returns only on Still.
 */

export type StageCardThemeId = 'gold' | 'blush' | 'sage' | 'dusk'

export interface StageCardTheme {
  id: StageCardThemeId
  label: string
  bg: string
  ink: string
  inkMuted: string
  border: string
  badgeFill: string
  badgeStroke: string
  /** Margo Symbol treatment — always full contrast */
  markVariant: 'on-light' | 'on-dark'
  swatch: string
}

export const STAGE_CARD_THEMES: StageCardTheme[] = [
  {
    id: 'gold',
    label: 'Gold',
    bg: '#E8C547',
    ink: '#07060A',
    inkMuted: 'rgba(7,6,10,0.62)',
    border: 'rgba(7,6,10,0.16)',
    badgeFill: 'rgba(7,6,10,0.1)',
    badgeStroke: 'rgba(7,6,10,0.16)',
    markVariant: 'on-light',
    swatch: '#E8C547',
  },
  {
    id: 'blush',
    label: 'Blush',
    bg: '#E8A8B0',
    ink: '#2A1218',
    inkMuted: 'rgba(42,18,24,0.62)',
    border: 'rgba(42,18,24,0.14)',
    badgeFill: 'rgba(42,18,24,0.1)',
    badgeStroke: 'rgba(42,18,24,0.16)',
    markVariant: 'on-light',
    swatch: '#E8A8B0',
  },
  {
    id: 'sage',
    label: 'Sage',
    bg: '#A8C4AE',
    ink: '#142218',
    inkMuted: 'rgba(20,34,24,0.62)',
    border: 'rgba(20,34,24,0.14)',
    badgeFill: 'rgba(20,34,24,0.1)',
    badgeStroke: 'rgba(20,34,24,0.16)',
    markVariant: 'on-light',
    swatch: '#A8C4AE',
  },
  {
    id: 'dusk',
    label: 'Dusk',
    bg: '#2A2438',
    ink: '#F4F1ED',
    inkMuted: 'rgba(244,241,237,0.62)',
    border: 'rgba(244,241,237,0.14)',
    badgeFill: 'rgba(255,255,255,0.1)',
    badgeStroke: 'rgba(255,255,255,0.16)',
    markVariant: 'on-dark',
    swatch: '#2A2438',
  },
]

const THEME_BY_ID = Object.fromEntries(
  STAGE_CARD_THEMES.map((t) => [t.id, t]),
) as Record<StageCardThemeId, StageCardTheme>

export function getStageCardTheme(id?: string | null): StageCardTheme {
  if (id && id in THEME_BY_ID) return THEME_BY_ID[id as StageCardThemeId]
  return THEME_BY_ID.gold
}

export function cycleStageCardTheme(id?: string | null): StageCardTheme {
  const idx = STAGE_CARD_THEMES.findIndex((t) => t.id === id)
  const next = STAGE_CARD_THEMES[(idx + 1) % STAGE_CARD_THEMES.length]
  return next ?? THEME_BY_ID.gold
}

/** Feed / karaoke room — used whenever a living Effect is on. */
export const ATMOSPHERE_ROOM_PAINT = {
  bg: '#07060A',
  ink: '#F4F1ED',
  inkMuted: 'rgba(244,241,237,0.62)',
  border: 'rgba(255,255,255,0.08)',
  badgeFill: 'rgba(255,255,255,0.10)',
  badgeStroke: 'rgba(255,255,255,0.16)',
  markVariant: 'on-dark' as const,
}

/** Color tokens only apply on Still. Living effects paint the platform room. */
export function resolveExportPaintTheme(
  themeId?: string | null,
  atmosphereId?: string | null,
): StageCardTheme {
  const chosen = getStageCardTheme(themeId)
  if (!isLivingAtmosphere(parseAtmosphere(atmosphereId))) return chosen
  return {
    ...chosen,
    ...ATMOSPHERE_ROOM_PAINT,
  }
}
