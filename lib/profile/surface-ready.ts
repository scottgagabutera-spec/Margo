/** Fired when `/api/profile/surface` extras merge into profile-warm cache. */
export const PROFILE_SURFACE_READY = 'margo-profile-surface-ready'

export function dispatchProfileSurfaceReady(username: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(PROFILE_SURFACE_READY, { detail: { username: username.toLowerCase() } }),
  )
}
