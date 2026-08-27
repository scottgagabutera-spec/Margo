/**
 * Stage Moment card layout tokens at the reference width (400px).
 *
 * Preview and export both resolve pixel values as:
 *   tokenPx = refToken * (outputWidthPx / STAGE_CARD_REF_WIDTH)
 *
 * This is the single source of truth for spacing and typography — not an
 * export-only artifact. At outputWidth 1080, lyric fontSize becomes
 * 29.6 * (1080/400) ≈ 80px.
 *
 * Future: resolveMomentLayout() may compose multiple segment layouts;
 * MomentTimeline will consume the same resolved geometry over time.
 */

export const STAGE_CARD_REF_WIDTH = 400

/** Default PNG export width — height is content-driven. */
export const STAGE_CARD_EXPORT_WIDTH = 1080

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
    /** Lyric size at ref width — scales linearly with output width */
    fontSize: 29.6,
    lineHeight: 1.35,
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

export function stageCardScale(outputWidthPx: number): number {
  return outputWidthPx / STAGE_CARD_REF_WIDTH
}

export function scaleStageToken(refPx: number, outputWidthPx: number): number {
  return refPx * stageCardScale(outputWidthPx)
}

export function roundStageToken(refPx: number, outputWidthPx: number): number {
  return Math.round(scaleStageToken(refPx, outputWidthPx))
}
