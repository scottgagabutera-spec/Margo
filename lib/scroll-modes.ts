/**
 * Scroll ownership contract (Phase 2D).
 *
 * Not enforced at runtime — documents which element owns scroll per surface
 * so web and future native implementations stay aligned.
 */

export type MargoScrollMode =
  | 'primary-pane'
  | 'document'
  | 'conversation'
  | 'immersive'
  | 'overlay'

export interface MargoScrollSurface {
  /** Route prefix or path pattern */
  path: string
  mode: MargoScrollMode
  /** Human-readable scroll owner */
  owner: string
}

/** Major surfaces — extend when adding new route families. */
export const MARGO_SCROLL_SURFACES: readonly MargoScrollSurface[] = [
  { path: '/feed', mode: 'primary-pane', owner: '[data-margo-primary-tab] pane (feed)' },
  { path: '/discover', mode: 'primary-pane', owner: '[data-margo-primary-tab] pane (discover)' },
  { path: '/compose', mode: 'primary-pane', owner: '[data-margo-primary-tab] pane + inner step panels' },
  { path: '/profile/[username] (own tab)', mode: 'primary-pane', owner: '[data-margo-primary-tab] pane (you)' },
  { path: '/messages', mode: 'document', owner: 'window / document' },
  { path: '/messages/[username]', mode: 'conversation', owner: 'MargoConversationLayout scroll region' },
  { path: '/song/[id]', mode: 'immersive', owner: 'Karaoke lyric scroll container' },
  { path: '/m/[id]', mode: 'immersive', owner: 'Moment recipient view' },
  { path: '/post, /search, /library, /settings, …', mode: 'document', owner: 'window / document' },
  { path: 'Hub panel', mode: 'overlay', owner: '.margo-hub-sheet / .margo-hub-panel' },
  { path: 'MargoSheet, AuthGateModal', mode: 'overlay', owner: 'Sheet body / modal panel' },
] as const
