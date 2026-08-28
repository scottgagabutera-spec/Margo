import { STAGE_CARD_EXPORT_WIDTH } from '@/lib/moment-export/layout/constants'

/** GIF export width — matches PNG/MP4 stage card (1080px). */
export const MOMENT_GIF_EXPORT_WIDTH = STAGE_CARD_EXPORT_WIDTH
export const MOMENT_GIF_FPS = 12
/** gifenc quantize/applyPalette format — rgb444 preserves gold tones better than rgb565. */
export const MOMENT_GIF_PALETTE_FORMAT = 'rgb444'
