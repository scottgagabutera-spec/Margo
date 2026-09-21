import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseCookieOptions } from '@/lib/supabase/cookie-options'
import { buildLegalConsentSettings, hasTermsAcceptanceRecorded, userNeedsTermsAcceptance } from '@/lib/legal/consent'
import {
  OAUTH_INTENT_COOKIE,
  OAUTH_TERMS_PENDING_COOKIE,
} from '@/lib/legal/oauth-intent'
import { buildOAuthErrorRedirectUrl } from '@/lib/oauth-error-redirect'
import {
  OAUTH_RETURN_COOKIE,
  sanitizeOAuthReturnPath,
} from '@/lib/oauth-return'

type CookieToSet = {
  name: string
  value: string
  options: Parameters<NextResponse['cookies']['set']>[2]
}

function applyOAuthCookies(
  response: NextResponse,
  pendingCookies: CookieToSet[],
  pendingHeaders: [string, string][],
) {
  response.cookies.set(OAUTH_TERMS_PENDING_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  response.cookies.set(OAUTH_INTENT_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  response.cookies.set(OAUTH_RETURN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
  pendingHeaders.forEach(([key, value]) => {
    response.headers.set(key, value)
  })
}

function toAppPath(origin: string, absoluteOrPath: string): string {
  if (absoluteOrPath.startsWith(origin)) {
    const rest = absoluteOrPath.slice(origin.length)
    return rest.startsWith('/') ? rest : `/${rest}`
  }
  return absoluteOrPath.startsWith('/') ? absoluteOrPath : `/${absoluteOrPath}`
}

/**
 * Exchange an OAuth PKCE code for a session using the httpOnly verifier cookie.
 * Returns a JSON NextResponse with `{ redirectTo }` and session Set-Cookie headers.
 */
export async function completeOAuthCodeExchange(
  request: NextRequest,
  code: string | null,
): Promise<NextResponse> {
  const origin = new URL(request.url).origin
  const oauthReturn = sanitizeOAuthReturnPath(
    request.cookies.get(OAUTH_RETURN_COOKIE)?.value,
  )
  const oauthIntent = request.cookies.get(OAUTH_INTENT_COOKIE)?.value
  const errorRedirect = buildOAuthErrorRedirectUrl(
    origin,
    oauthReturn,
    'auth',
    oauthIntent === 'signup' ? { mode: 'signup' } : undefined,
  )

  const json = (redirectTo: string, cookies?: CookieToSet[], headers?: [string, string][]) => {
    const response = NextResponse.json({ redirectTo })
    if (cookies && headers) applyOAuthCookies(response, cookies, headers)
    return response
  }

  if (!code) {
    return json(errorRedirect)
  }

  const termsPending = request.cookies.get(OAUTH_TERMS_PENDING_COOKIE)?.value === '1'
  const pendingCookies: CookieToSet[] = []
  const pendingHeaders: [string, string][] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options })
          })
          Object.entries(headers).forEach(([key, value]) => {
            pendingHeaders.push([key, value])
          })
        },
      },
    },
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('exchangeCodeForSession failed:', error.message)
    return json(errorRedirect)
  }

  let user = data.user

  if (termsPending && user && !hasTermsAcceptanceRecorded(user.user_metadata as Record<string, unknown>)) {
    const legal = buildLegalConsentSettings()
    const { data: updateData, error: metaErr } = await supabase.auth.updateUser({
      data: {
        terms_accepted_at: legal.termsAcceptedAt,
        terms_version: legal.termsVersion,
      },
    })
    if (metaErr) {
      console.error('Failed to record OAuth terms consent:', metaErr.message)
    } else if (updateData.user) {
      user = updateData.user
    }
  }

  let redirectTarget = oauthReturn || '/feed'
  if (user && userNeedsTermsAcceptance(user)) {
    const params = new URLSearchParams({ step: 'terms' })
    if (oauthReturn) params.set('returnTo', oauthReturn)
    redirectTarget = `/signin?${params.toString()}`
  }

  return json(toAppPath(origin, redirectTarget), pendingCookies, pendingHeaders)
}
