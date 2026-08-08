/**
 * Cleanup of pre–httpOnly Supabase auth material that is still readable
 * from JavaScript. HttpOnly session cookies are invisible to document.cookie
 * and cannot be removed from here — they are left untouched.
 *
 * Must run before GET /api/auth/me: a leftover non-httpOnly base cookie
 * (sb-<ref>-auth-token) shadows HttpOnly chunks in @supabase/ssr
 * combineChunks (base name wins over .0/.1/…).
 */

/** Matches @supabase/ssr getWithHints optimistic window (.0–.4), plus one extra. */
const PROACTIVE_CHUNK_MAX = 5

function projectRefFromSupabaseUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname
    const ref = host.split('.')[0]
    return ref || null
  } catch {
    return null
  }
}

function storageKeyForRef(projectRef: string) {
  return `sb-${projectRef}-auth-token`
}

function isLegacyAuthName(name: string, projectRef: string): boolean {
  // sb-<ref>-auth-token, …auth-token.0, …auth-token-code-verifier, etc.
  const prefix = `sb-${projectRef}-`
  if (!name.startsWith(prefix)) return false
  return name.slice(prefix.length).startsWith('auth-token')
}

function expireReadableCookie(name: string) {
  // Match path=/ used by @supabase/ssr. Emit both secure and non-secure
  // Max-Age=0 lines so localhost (no Secure) and prod cookies clear.
  // HttpOnly cookies with the same name are not modified by document.cookie.
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`
}

function clearMatchingStorage(storage: Storage, projectRef: string) {
  const toRemove: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key && isLegacyAuthName(key, projectRef)) {
      toRemove.push(key)
    }
  }
  for (const key of toRemove) {
    storage.removeItem(key)
  }
}

/** Strip JS-readable legacy Supabase auth cookies + local/session storage. */
export function clearLegacyAuthStorage() {
  if (typeof document === 'undefined') return

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return

  const projectRef = projectRefFromSupabaseUrl(url)
  if (!projectRef) return

  const storageKey = storageKeyForRef(projectRef)
  const names = new Set<string>()

  // Always target base + proactive chunk indices (even if not listed yet).
  names.add(storageKey)
  for (let i = 0; i <= PROACTIVE_CHUNK_MAX; i++) {
    names.add(`${storageKey}.${i}`)
  }
  names.add(`${storageKey}-code-verifier`)

  // Also expire any readable auth-token* currently visible (catches .6+, flow keys, etc.).
  for (const part of document.cookie.split(';')) {
    const name = part.trim().split('=')[0]
    if (name && isLegacyAuthName(name, projectRef)) {
      names.add(name)
    }
  }

  for (const name of names) {
    expireReadableCookie(name)
  }

  try {
    clearMatchingStorage(localStorage, projectRef)
  } catch {
    // private mode / blocked storage
  }

  try {
    clearMatchingStorage(sessionStorage, projectRef)
  } catch {
    // private mode / blocked storage
  }
}
