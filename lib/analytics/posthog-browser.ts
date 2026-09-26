import posthog from 'posthog-js'

let initialized = false

function posthogKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || undefined
}

/** True when PostHog is configured (env present). Safe on server and client. */
export function isPostHogConfigured(): boolean {
  return !!posthogKey()
}

/**
 * Lazily init PostHog in the browser only. No-op without NEXT_PUBLIC_POSTHOG_KEY.
 * Session replay and autocapture stay off by design.
 */
export function initPostHogBrowser(): typeof posthog | null {
  if (typeof window === 'undefined') return null
  const key = posthogKey()
  if (!key) return null
  if (!initialized) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com',
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST?.trim() || 'https://us.posthog.com',
      capture_pageview: false,
      autocapture: false,
      disable_session_recording: true,
      persistence: 'localStorage+cookie',
    })
    initialized = true
  }
  return posthog
}

export function capturePostHogPageView(url: string): void {
  if (typeof window === 'undefined') return
  try {
    const client = initPostHogBrowser()
    if (!client) return
    client.capture('$pageview', { $current_url: url })
  } catch {
    // Analytics must never block UX.
  }
}

export function capturePostHogEvent(
  event: string,
  properties?: Record<string, string | number | boolean | null>,
): void {
  if (typeof window === 'undefined') return
  try {
    const client = initPostHogBrowser()
    if (!client) return
    client.capture(event, properties ?? {})
  } catch {
    // Analytics must never block UX.
  }
}
