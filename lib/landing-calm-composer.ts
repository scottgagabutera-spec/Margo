import type { AtmosphereId } from '@/lib/atmosphere'
import { STAGE_CARD_THEMES } from '@/lib/moment/stage-theme'

export type CalmEffectId = 'none' | 'artwork' | 'glow' | 'grain'

export const CALM_COLOR_OPTIONS = STAGE_CARD_THEMES.map((t) => ({
  id: t.id,
  label: t.label,
  themeId: t.id,
  swatch: t.swatch,
}))

export const CALM_EFFECT_OPTIONS: { id: CalmEffectId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'artwork', label: 'Artwork' },
  { id: 'glow', label: 'Glow' },
  { id: 'grain', label: 'Grain' },
]

export function calmEffectToAtmosphere(id: CalmEffectId): AtmosphereId {
  if (id === 'glow') return 'pulse'
  if (id === 'grain') return 'weight'
  return 'still'
}

export function calmUsesArtworkBackdrop(id: CalmEffectId): boolean {
  return id === 'artwork'
}

export function defaultCalmEffectForSong(isMargoCatalog: boolean): CalmEffectId {
  return isMargoCatalog ? 'artwork' : 'none'
}

export function externalSourceLabel(source: 'margo' | 'genius' | 'apple'): string | null {
  if (source === 'apple') return 'From Apple Music'
  if (source === 'genius') return 'From Genius'
  return null
}

export function margoChipSubtitle(snippetStartSec: number | null): string {
  if (snippetStartSec == null || !Number.isFinite(snippetStartSec)) {
    return 'Hosted on Margo'
  }
  const m = Math.floor(snippetStartSec / 60)
  const s = Math.floor(snippetStartSec % 60)
  return `Hosted on Margo, line from ${m}:${String(s).padStart(2, '0')}`
}

export const LANDING_DRAFT_STORAGE_KEY = 'margo-landing-composer-draft'
