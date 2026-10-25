/** Parse Supabase auth callback params from query and hash (client-only). */

export type AuthCallbackParams = {
  token_hash: string | null
  type: string | null
  error: string | null
  error_code: string | null
  error_description: string | null
}

function parseParamString(input: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!input) return out
  const trimmed = input.startsWith('?') || input.startsWith('#')
    ? input.slice(1)
    : input
  if (!trimmed) return out
  const sp = new URLSearchParams(trimmed)
  sp.forEach((value, key) => {
    out[key] = value
  })
  return out
}

export function mergeAuthCallbackParams(
  search: string,
  hash: string,
): AuthCallbackParams {
  const merged = {
    ...parseParamString(search),
    ...parseParamString(hash),
  }
  return {
    token_hash: merged.token_hash ?? null,
    type: merged.type ?? null,
    error: merged.error ?? null,
    error_code: merged.error_code ?? null,
    error_description: merged.error_description ?? null,
  }
}

const STRIP_KEYS = new Set([
  'token_hash',
  'token',
  'type',
  'code',
  'access_token',
  'refresh_token',
  'error',
  'error_code',
  'error_description',
])

/** Remove sensitive auth params from the address bar without navigation. */
export function stripAuthSecretsFromBrowserUrl(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  let changed = false
  for (const key of [...url.searchParams.keys()]) {
    if (STRIP_KEYS.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (url.hash) {
    const hashParams = parseParamString(url.hash)
    let hashChanged = false
    for (const key of Object.keys(hashParams)) {
      if (STRIP_KEYS.has(key)) {
        delete hashParams[key]
        hashChanged = true
      }
    }
    if (hashChanged) {
      const next = new URLSearchParams(hashParams).toString()
      url.hash = next ? `#${next}` : ''
      changed = true
    }
  }
  if (changed) {
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }
}

export function recoveryTypeFromParams(type: string | null): 'recovery' | null {
  if (!type) return null
  return type === 'recovery' ? 'recovery' : null
}
