import { STAGE_CARD_EXPORT_WIDTH } from '@/lib/moment-export/layout/constants'

/** Video matches PNG stage card width — height is content-driven. */
export const MOMENT_VIDEO_WIDTH = STAGE_CARD_EXPORT_WIDTH
export const MOMENT_VIDEO_FPS = 30
/** Align with audio-engine SNIPPET_MAX_DURATION_SEC — full snippet, not a short clip cap. */
export const MOMENT_VIDEO_MAX_DURATION_SEC = 30
/** Silent hold of the final lyric frame so social apps pick a readable thumbnail. */
export const MOMENT_VIDEO_POSTER_HOLD_SEC = 1
/** Export-only opening hold — complete card before animation (thumbnail-safe). */
export const MOMENT_EXPORT_INTRO_HOLD_SEC = 1

/** Shorts-only: render at 2× layout pixels, then downscale to 1080×1920 before H.264. */
export const MOMENT_SHORTS_VIDEO_RENDER_SCALE = 2

/** YouTube ingest: key frame every 15 frames @ 30 fps (Mediabunny uses seconds). */
export const MOMENT_SHORTS_KEY_FRAME_INTERVAL_SEC = 15 / MOMENT_VIDEO_FPS
