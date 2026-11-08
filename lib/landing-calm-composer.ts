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
