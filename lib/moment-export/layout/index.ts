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
  STAGE_CARD_EXPORT_WIDTH,
  STAGE_CARD_LAYOUT_REF,
  STAGE_CARD_REF_WIDTH,
  roundStageToken,
  scaleStageToken,
  stageCardScale,
} from '@/lib/moment-export/layout/constants'

export {
  layoutLyricText,
  normalizeLineEndings,
  splitIntentionalParagraphs,
  truncateToWidth,
  wrapParagraph,
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
  LayoutMarkBadge,
  LayoutMetaBlock,
  LayoutRect,
  LayoutTextStyle,
  LayoutVibePill,
  ResolvedStageCardLayout,
  StageCardLayoutInput,
  TextMeasureFn,
} from '@/lib/moment-export/layout/types'
