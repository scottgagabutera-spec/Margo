import { createBrowserClient } from '@supabase/ssr'

/**
 * Auth core — browser client with access token only in process memory.
 * HttpOnly cookies are owned by the server; cookie I/O here is a no-op.
 * PostgREST/Realtime calls attach Authorization: Bearer <memory access token>.
 * On 401: single-flight POST /api/auth/refresh, then retry the request once.
 */
let memoryAccessToken: string | null = null

/** Provider registers so refresh-failure can clear React auth state. */
let onSessionInvalid: (() => void) | null = null

/** In-flight refresh shared across concurrent 401s. Never nested via this fetch. */
let refreshInFlight: Promise<boolean> | null = null

export function setBrowserAccessToken(token: string | null) {
  memoryAccessToken = token
}

export function getBrowserAccessToken() {
  return memoryAccessToken
}

/**
 * Register a single session-invalid handler (auth provider).
 * Pass null on unmount so a stale closure cannot run after teardown.
 */
export function setOnSessionInvalid(handler: (() => void) | null) {
  onSessionInvalid = handler
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      // Bare fetch — must not go through supabase global.fetch (no recursion).
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        await failSession()
        return false
      }
      const body = (await res.json()) as { access_token?: string }
      if (!body.access_token) {
        await failSession()
        return false
      }
      setBrowserAccessToken(body.access_token)
      return true
    } catch {
      await failSession()
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

async function failSession() {
  await signOutBrowser()
  onSessionInvalid?.()
}

async function fetchWithAuthRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const sentToken = memoryAccessToken
  const headers = new Headers(init?.headers)
  if (sentToken) {
    headers.set('Authorization', `Bearer ${sentToken}`)
  }

  const res = await fetch(input, { ...init, headers })

  // Only refresh when this request was authenticated and got 401.
  if (res.status !== 401 || !sentToken) {
    return res
  }

  // Peer request may already have refreshed while we were in flight.
  if (memoryAccessToken === sentToken) {
    const refreshed = await refreshAccessToken()
    if (!refreshed) {
      return res
    }
  }

  // Retry once with the current memory token — never refresh again on this attempt.
  const retryHeaders = new Headers(init?.headers)
  if (memoryAccessToken) {
    retryHeaders.set('Authorization', `Bearer ${memoryAccessToken}`)
  }
  return fetch(input, { ...init, headers: retryHeaders })
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // no-op — httpOnly session cookies are server-owned
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: fetchWithAuthRetry,
      },
    },
  )
}

/** Clear memory JWT and clear httpOnly session cookies via the server. */
export async function signOutBrowser() {
  setBrowserAccessToken(null)
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // best-effort cookie clear
  }
}
