/**
 * Dual type system (Brand §3):
 * - UI_FONT — Geist Sans for chrome, chrome labels, nav, meta
 * - LYRIC_FONT — Lora for posted lyrics / lyric-led marketing copy
 * - Sora remains logo-only via MargoLogo / --font-sora
 *
 * Feed post cards: use FEED_TYPE CSS variables (see globals.css) — not ad hoc rem.
 */
export const UI_FONT = 'var(--font-geist-sans), system-ui, sans-serif'
export const LYRIC_FONT = 'var(--font-lora), serif'

/** App-wide TYPE roles (non-feed). */
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

/** Feed post card typography scale (min size 0.625rem on card). */
export const FEED_TYPE_SCALE = {
  lyric: '1.0625rem',
  lyricLineHeight: '1.5',
  songTitle: '0.875rem',
  artist: '0.75rem',
  displayName: '0.875rem',
  handle: '0.75rem',
  date: '0.6875rem',
  actionLabel: '0.6875rem',
  actionBadge: '0.625rem',
  moodChip: '0.625rem',
  sectionLabel: '0.625rem',
  lyricHero: '1.5rem',
  lyricShort: '1.25rem',
  lyricMedium: '1.0625rem',
  lyricLong: '1rem',
  lyricVeryLong: '0.9375rem',
} as const

/** Maps feed type tokens to CSS custom property names (values in :root). */
export const FEED_TYPE = {
  lyric: '--feed-type-lyric',
  lyricLineHeight: '--feed-type-lyric-lh',
  songTitle: '--feed-type-song-title',
  artist: '--feed-type-artist',
  displayName: '--feed-type-display-name',
  handle: '--feed-type-handle',
  date: '--feed-type-date',
  actionLabel: '--feed-type-action-label',
  actionBadge: '--feed-type-action-badge',
  moodChip: '--feed-type-mood-chip',
  sectionLabel: '--feed-type-section-label',
  lyricHero: '--feed-type-lyric-hero',
  lyricShort: '--feed-type-lyric-short',
  lyricMedium: '--feed-type-lyric-medium',
  lyricLong: '--feed-type-lyric-long',
  lyricVeryLong: '--feed-type-lyric-very-long',
} as const
