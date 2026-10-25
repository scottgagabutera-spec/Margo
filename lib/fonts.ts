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

/** Feed post card typography scale (min 0.75rem on card chrome). */
export const FEED_TYPE_SCALE = {
  lyric: '1.0625rem',
  lyricLineHeight: '1.55',
  displayName: '0.9375rem',
  handle: '0.8125rem',
  date: '0.8125rem',
  songTitle: '0.8125rem',
  artist: '0.75rem',
  controlLabel: '0.8125rem',
  feedActionLabel: '0.75rem',
  actionCount: '0.8125rem',
  moodChip: '0.75rem',
  sectionLabel: '0.75rem',
  aiLabel: '0.75rem',
  suggestionLyric: '0.9375rem',
  /** Export / Discover hero lyric — not used on feed card moment body. */
  lyricHero: '1.5rem',
} as const

/** Maps feed type tokens to CSS custom property names (values in :root). */
export const FEED_TYPE = {
  lyric: '--feed-type-lyric',
  lyricLineHeight: '--feed-type-lyric-lh',
  displayName: '--feed-type-display-name',
  handle: '--feed-type-handle',
  date: '--feed-type-date',
  songTitle: '--feed-type-song-title',
  artist: '--feed-type-artist',
  controlLabel: '--feed-type-control-label',
  feedActionLabel: '--feed-type-feed-action-label',
  actionCount: '--feed-type-action-count',
  moodChip: '--feed-type-mood-chip',
  sectionLabel: '--feed-type-section-label',
  aiLabel: '--feed-type-ai-label',
  suggestionLyric: '--feed-type-suggestion-lyric',
  lyricHero: '--feed-type-lyric-hero',
} as const
