export const WELCOME_SERIES_REFRESH_EVENT = 'margo:welcome-series-refresh'

/** Run sync immediately after onboarding (bypasses layout throttle). */
export async function flushWelcomeSeriesAfterOnboarding(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    await fetch('/api/welcome-series/sync', {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // best effort
  }
  window.dispatchEvent(new Event(WELCOME_SERIES_REFRESH_EVENT))
}
