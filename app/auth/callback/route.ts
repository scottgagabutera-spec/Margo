import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseCookieOptions } from '@/lib/supabase/cookie-options'
import { buildLegalConsentSettings } from '@/lib/legal/consent'
import {
  OAUTH_INTENT_COOKIE,
  OAUTH_TERMS_PENDING_COOKIE,
} from '@/lib/legal/oauth-intent'
import { userNeedsTermsAcceptance } from '@/lib/legal/oauth-new-user'

/**
 * OAuth PKCE callback (Google / Discord).
 * Exchanges ?code= for a session using the httpOnly PKCE verifier cookie
 * set by GET /api/auth/oauth/[provider], then writes session cookies on
 * the redirect. Browser rehydrate via GET /api/auth/me.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=auth`)
  }

  const termsPending = request.cookies.get(OAUTH_TERMS_PENDING_COOKIE)?.value === '1'
  const oauthIntent = request.cookies.get(OAUTH_INTENT_COOKIE)?.value

  const pendingCookies: {
    name: string
    value: string
    options: Parameters<NextResponse['cookies']['set']>[2]
  }[] = []
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
    const errTarget = oauthIntent === 'signup'
      ? `${origin}/signin?mode=signup&error=auth`
      : `${origin}/signin?error=auth`
    return NextResponse.redirect(errTarget)
  }

  if (termsPending && data.user) {
    const existingTerms = data.user.user_metadata?.terms_accepted_at
    if (!existingTerms) {
      const legal = buildLegalConsentSettings()
      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          terms_accepted_at: legal.termsAcceptedAt,
          terms_version: legal.termsVersion,
        },
      })
      if (metaErr) {
        console.error('Failed to record OAuth terms consent:', metaErr.message)
      }
    }
  }

  let redirectTarget = `${origin}/feed`
  if (!termsPending && data.user && userNeedsTermsAcceptance(data.user)) {
    redirectTarget = `${origin}/signin?step=terms`
  }

  const response = NextResponse.redirect(redirectTarget)
  response.cookies.set(OAUTH_TERMS_PENDING_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  response.cookies.set(OAUTH_INTENT_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
  pendingHeaders.forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}
