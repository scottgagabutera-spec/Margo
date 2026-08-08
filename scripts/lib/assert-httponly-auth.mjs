/**
 * Tier A auth cookie guards for verify scripts.
 * - POST /api/auth/login Set-Cookie must mark sb-*-auth-token* as HttpOnly (+ SameSite=Lax)
 * - login / me / refresh JSON must never include refresh_token (spike regression)
 *
 * Requires Next running at baseUrl (VERIFY_BASE_URL or http://localhost:3000).
 */

/** Cookie names for the Supabase auth session storage key (+ chunks / verifier). */
export function isAuthTokenCookieName(name) {
  return typeof name === 'string' && /^sb-[^=]*-auth-token/.test(name)
}

export function getSetCookieList(res) {
  if (typeof res.headers.getSetCookie === 'function') {
    return res.headers.getSetCookie()
  }
  const single = res.headers.get('set-cookie')
  if (!single) return []
  // Weak fallback — modern Node provides getSetCookie().
  return [single]
}

export function assertNoRefreshTokenInBody(body, label) {
  if (body == null || typeof body !== 'object') return
  if (Object.prototype.hasOwnProperty.call(body, 'refresh_token')) {
    throw new Error(
      `${label}: response JSON must not include refresh_token (Tier A / spike regression)`,
    )
  }
}

/**
 * Assert every Set-Cookie for auth-token cookies includes HttpOnly and SameSite=Lax.
 */
export function assertAuthSetCookiesHttpOnly(setCookieLines) {
  const authLines = []
  for (const line of setCookieLines) {
    if (!line) continue
    const name = line.split('=')[0]?.trim()
    if (!isAuthTokenCookieName(name)) continue
    authLines.push(line)
    if (!/;\s*HttpOnly/i.test(line)) {
      throw new Error(`auth cookie "${name}" missing HttpOnly flag: ${line}`)
    }
    if (!/;\s*SameSite=Lax/i.test(line)) {
      throw new Error(`auth cookie "${name}" missing SameSite=Lax: ${line}`)
    }
  }
  if (authLines.length === 0) {
    throw new Error(
      'no sb-*-auth-token* Set-Cookie headers on login — cannot assert HttpOnly',
    )
  }
  return authLines
}

export function cookieHeaderFromSetCookieLines(setCookieLines) {
  return setCookieLines
    .map((line) => line.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
}

/**
 * Hits real Auth core routes: login → me → refresh.
 * Asserts HttpOnly Set-Cookie on login and no refresh_token in any JSON body.
 * @returns {{ cookieHeader: string, accessToken: string | null }}
 */
export async function verifyHttpOnlyAuthCore({ baseUrl, email, password }) {
  const root = baseUrl.replace(/\/$/, '')

  const loginRes = await fetch(`${root}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const loginBody = await loginRes.json().catch(() => ({}))
  if (!loginRes.ok) {
    throw new Error(`login failed ${loginRes.status}: ${JSON.stringify(loginBody)}`)
  }
  assertNoRefreshTokenInBody(loginBody, 'POST /api/auth/login')

  const setCookies = getSetCookieList(loginRes)
  assertAuthSetCookiesHttpOnly(setCookies)
  const cookieHeader = cookieHeaderFromSetCookieLines(setCookies)

  const meRes = await fetch(`${root}/api/auth/me`, {
    headers: { Cookie: cookieHeader },
  })
  const meBody = await meRes.json().catch(() => ({}))
  if (!meRes.ok) {
    throw new Error(`GET /api/auth/me failed ${meRes.status}: ${JSON.stringify(meBody)}`)
  }
  assertNoRefreshTokenInBody(meBody, 'GET /api/auth/me')

  const refreshRes = await fetch(`${root}/api/auth/refresh`, {
    method: 'POST',
    headers: { Cookie: cookieHeader },
  })
  const refreshBody = await refreshRes.json().catch(() => ({}))
  if (!refreshRes.ok) {
    throw new Error(
      `POST /api/auth/refresh failed ${refreshRes.status}: ${JSON.stringify(refreshBody)}`,
    )
  }
  assertNoRefreshTokenInBody(refreshBody, 'POST /api/auth/refresh')

  // If refresh rotates cookies, those must stay HttpOnly too.
  const refreshSet = getSetCookieList(refreshRes)
  const refreshAuth = refreshSet.filter((line) =>
    isAuthTokenCookieName(line.split('=')[0]?.trim()),
  )
  if (refreshAuth.length > 0) {
    assertAuthSetCookiesHttpOnly(refreshAuth)
  }

  console.log(
    '  Tier A auth cookies → HttpOnly + SameSite=Lax; login/me/refresh omit refresh_token (ok)',
  )

  return {
    cookieHeader,
    accessToken: loginBody.access_token ?? meBody.access_token ?? null,
  }
}
