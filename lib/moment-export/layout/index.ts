/**
 * Margo Moment export layout — shared resolver for React preview + Canvas PNG.
 *
 * Phase 1: Stage card (single primary export path).
 *
 * LEGACY / DEFERRED: `drawMomentPoster` in render-moment.ts remains the
 * multi-line (>1 segment) PNG path. It is NOT the long-term architecture.
 * Future work: resolveMomentLayout() → MomentTimeline → renderFrame(layout, time)
 * for static image, MP4, and Animated Text — one layout system, not a third
 * poster-specific model.
 */

export {
  SHORTS_ASPECT,
  STAGE_CARD_EXPORT_SCALE,
  STAGE_CARD_EXPORT_WIDTH,
  STAGE_CARD_LAYOUT_REF,
  STAGE_CARD_REF_WIDTH,
  STAGE_SHORTS_LAYOUT_REF,
  roundStageToken,
  scaleStageToken,
  stageCardScale,
} from '@/lib/moment-export/layout/constants'

export {
  layoutLyricText,
  normalizeLineEndings,
  presentLyricText,
  splitIntentionalParagraphs,
  truncateToWidth,
  wrapParagraph,
  wrapParagraphBalanced,
} from '@/lib/moment-export/layout/text-layout'

export {
  buildCanvasTextMeasure,
  resolveStageCardLayout,
} from '@/lib/moment-export/layout/resolve-stage-card-layout'

export {
  resolveGeistFontFamily,
  waitForExportFonts,
} from '@/lib/moment-export/layout/export-fonts'

export type {
  LayoutBackground,
  LayoutLyricBlock,
  LayoutLyricLine,
  LayoutMarkBadge,
  LayoutMetaBlock,
  LayoutRect,
  LayoutTextStyle,
  LayoutVibePill,
  ResolvedStageCardLayout,
  StageCardFormat,
  StageCardLayoutInput,
  TextMeasureFn,
} from '@/lib/moment-export/layout/types'
