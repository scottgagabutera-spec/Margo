/**
 * Feed layout tokens — shared primitives with Stage export where sensible.
 * Feed and Stage use different compositions; these are spacing/scale anchors only.
 *
 * Vibe shape: Feed uses VibeTag (price-tag SVG); Stage/export use rounded pill.
 * Unifying vibe language is deferred — see navigation/feed UX pass notes.
 *
 * M mark: geometry lives in MargoSymbol, MargoLogo, and canvas drawMargoSymbol().
 * Centralizing mark paths is deferred to avoid destabilizing export rendering.
 */

/** Inline artwork thumb in Feed cards (matches Stage ref artwork at ~400px scale). */
export const FEED_ARTWORK_THUMB_PX = 56
