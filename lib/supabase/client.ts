import { createBrowserClient } from '@supabase/ssr'

/**
 * Auth core — browser client with access token only in process memory.
 * HttpOnly cookies are owned by the server; cookie I/O here is a no-op.
 * PostgREST/Realtime calls attach Authorization: Bearer <memory access token>.
 */
let memoryAccessToken: string | null = null

export function setBrowserAccessToken(token: string | null) {
  memoryAccessToken = token
}

export function getBrowserAccessToken() {
  return memoryAccessToken
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
        fetch: (input, init) => {
          const headers = new Headers(init?.headers)
          if (memoryAccessToken) {
            headers.set('Authorization', `Bearer ${memoryAccessToken}`)
          }
          return fetch(input, { ...init, headers })
        },
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
