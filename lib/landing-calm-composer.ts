export function externalSourceLabel(source: 'margo' | 'genius' | 'apple'): string | null {
  if (source === 'apple') return 'From Apple Music'
  if (source === 'genius') return 'From Genius'
  return null
}

export const LANDING_DRAFT_STORAGE_KEY = 'margo-landing-composer-draft'
