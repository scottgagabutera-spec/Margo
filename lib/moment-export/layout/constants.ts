/**
 * Stage Moment card layout tokens at the reference width (400px).
 *
 * Preview and export both resolve pixel values as:
 *   tokenPx = refToken * (outputWidthPx / STAGE_CARD_REF_WIDTH)
 *
 * This is the single source of truth for spacing and typography — not an
 * export-only artifact. Type scales down from these maxima so each selected
 * lyric line stays on one row when it can; wrapping is the last resort.
 * Feed at 1080 ≈ 76px max; Shorts ≈ 103px max.
 *
 * Future: resolveMomentLayout() may compose multiple segment layouts;
 * MomentTimeline will consume the same resolved geometry over time.
 */

export const STAGE_CARD_REF_WIDTH = 400

/** Default PNG export width — height is content-driven. */
export const STAGE_CARD_EXPORT_WIDTH = 1080

/** Supersampling for PNG / frame export (1080 logical → 1080×scale px). */
export const STAGE_CARD_EXPORT_SCALE = 3

export const STAGE_CARD_LAYOUT_REF = {
  padding: { top: 20, right: 52, bottom: 18, left: 20 },
  borderRadius: 16,
  highlight: {
    /** Fraction of card height for gradient fade */
    heightFraction: 0.28,
    opacityLight: 0.06,
    opacityDark: 0.04,
  },
  lyric: {
    fontFamily: 'Lora, serif',
    fontStyle: 'italic' as const,
    fontWeight: 400,
    /** Maximum Feed lyric size — shrinks to minFontSize to keep a thought intact */
    fontSize: 28,
    minFontSize: 18,
    lineHeight: 1.34,
    /** Extra space between selected lines (not wrap continuations), in em */
    stanzaGapEm: 0.42,
  },
  meta: {
    gap: 14,
    song: {
      fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
      fontSize: 12,
      fontWeight: 700,
      lineHeight: 1.25,
    },
    artist: {
      fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
      fontSize: 11.04,
      fontWeight: 400,
      lineHeight: 1.25,
      marginTop: 3,
      blockLineHeight: 1.3,
    },
  },
  artwork: { size: 48, radius: 8, gap: 14 },
  mark: {
    container: 34,
    symbol: 22,
    inset: 16,
    insetShadowLight: 'rgba(255,255,255,0.22)',
    insetShadowDark: 'rgba(255,255,255,0.08)',
  },
  vibePill: {
    height: 22,
    fontSize: 8.96,
    fontWeight: 700,
    maxWidth: 88,
    paddingH: 10,
    minWidth: 52,
    rowGap: 14,
  },
  /** Space between lyric block and mark column */
  markContentGap: 8,
} as const

/**
 * YouTube Shorts / TikTok / Reels chrome (9:16).
 * Bottom: title, sound sticker, nav. Top: search / close. Right: likes.
 * Credits must sit inside the remaining safe rectangle, not on the frame edge.
 */
export const VERTICAL_SOCIAL_SAFE = {
  topFraction: 0.10,
  bottomFraction: 0.22,
  sideFraction: 0.07,
} as const

/** Native 9:16 Shorts tokens at the 400px reference width. */
export const STAGE_SHORTS_LAYOUT_REF = {
  padding: { top: 56, right: 32, bottom: 44, left: 32 },
  borderRadius: 0,
  lyric: {
    /** Maximum Shorts lyric size — stacked poem, not a feed card scaled up */
    fontSize: 38,
    minFontSize: 22,
    lineHeight: 1.26,
    stanzaGapEm: 0.36,
  },
  artwork: { size: 56, radius: 10, gap: 16 },
  /** Space under the last lyric line before cover / song / artist. */
  lyricCreditGap: 36,
} as const

export const SHORTS_ASPECT = 16 / 9

export function stageCardScale(outputWidthPx: number): number {
  return outputWidthPx / STAGE_CARD_REF_WIDTH
}

export function scaleStageToken(refPx: number, outputWidthPx: number): number {
  return refPx * stageCardScale(outputWidthPx)
}

export function roundStageToken(refPx: number, outputWidthPx: number): number {
  return Math.round(scaleStageToken(refPx, outputWidthPx))
}
