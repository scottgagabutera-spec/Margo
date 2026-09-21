/**
 * Dual type system (Brand §3):
 * - UI_FONT — Geist Sans for chrome, chrome labels, nav, meta
 * - LYRIC_FONT — Lora for posted lyrics / lyric-led marketing copy
 * - Sora remains logo-only via MargoLogo / --font-sora
 *
 * Two faces only. Pick a TYPE role instead of inventing rem values.
 */
export const UI_FONT = 'var(--font-geist-sans), system-ui, sans-serif'
export const LYRIC_FONT = 'var(--font-lora), serif'

export const TYPE = {
  pageTitle: '1.5rem',
  displayName: '1.25rem',
  song: '0.95rem',
  lyric: '1.1rem',
  body: '0.95rem',
  secondary: '0.82rem',
  artist: '0.75rem',
  meta: '0.7rem',
  label: '0.6rem',
} as const
