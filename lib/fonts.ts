/**
 * Margo type system (Brand §3):
 * - UI_FONT — Geist Sans for all UI chrome
 * - LYRIC_FONT — Lora upright for lyric content only
 * - Sora — wordmark only (MargoLogo)
 *
 * Five rem steps — 12px floor (L = 0.75rem). Use CSS vars in globals.css or MARGO_TYPE below.
 */
export const UI_FONT = 'var(--font-geist-sans), system-ui, sans-serif'
export const LYRIC_FONT = 'var(--font-lora), serif'

/** Canonical 5-step scale (matches :root --margo-type-*). */
export const MARGO_TYPE = {
  t: 'var(--margo-type-t)',
  h: 'var(--margo-type-h)',
  b: 'var(--margo-type-b)',
  m: 'var(--margo-type-m)',
  l: 'var(--margo-type-l)',
} as const

export const MARGO_TYPE_PX = {
  t: '1.0625rem',
  h: '0.9375rem',
  b: '0.875rem',
  m: '0.8125rem',
  l: '0.75rem',
} as const

/** Depth pages (Messages, Notifications, Library). */
export const DEPTH_PAGE_TITLE = {
  fontFamily: UI_FONT,
  fontSize: MARGO_TYPE_PX.t,
  fontWeight: 500,
  color: 'var(--text)',
  margin: 0,
  letterSpacing: '-0.01em',
} as const

/** List rows: name B, preview M, time L (messages, notifications). */
export const LIST_ROW_TYPE = {
  name: MARGO_TYPE_PX.b,
  preview: MARGO_TYPE_PX.m,
  time: MARGO_TYPE_PX.l,
  chip: MARGO_TYPE_PX.m,
} as const

/** @deprecated Use MARGO_TYPE_PX — kept for gradual migration */
export const TYPE = {
  pageTitle: MARGO_TYPE_PX.t,
  displayName: MARGO_TYPE_PX.h,
  song: MARGO_TYPE_PX.h,
  lyric: MARGO_TYPE_PX.h,
  body: MARGO_TYPE_PX.b,
  secondary: MARGO_TYPE_PX.m,
  artist: MARGO_TYPE_PX.m,
  meta: MARGO_TYPE_PX.m,
  label: MARGO_TYPE_PX.l,
} as const

/** Feed card tokens — alias unified scale (see :root --feed-type-*). */
export const FEED_TYPE_SCALE = {
  lyric: MARGO_TYPE_PX.h,
  lyricLineHeight: '1.55',
  displayName: MARGO_TYPE_PX.b,
  handle: MARGO_TYPE_PX.m,
  date: MARGO_TYPE_PX.m,
  songTitle: MARGO_TYPE_PX.h,
  artist: MARGO_TYPE_PX.m,
  controlLabel: MARGO_TYPE_PX.m,
  feedActionLabel: MARGO_TYPE_PX.l,
  actionCount: MARGO_TYPE_PX.m,
  moodChip: MARGO_TYPE_PX.l,
  sectionLabel: MARGO_TYPE_PX.l,
  aiLabel: MARGO_TYPE_PX.l,
  suggestionLyric: MARGO_TYPE_PX.h,
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
