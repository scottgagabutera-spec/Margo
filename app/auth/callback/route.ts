import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseCookieOptions } from '@/lib/supabase/cookie-options'

/**
 * OAuth PKCE callback (Google / Discord).
 * Exchanges ?code= for a session using the httpOnly PKCE verifier cookie
 * set by GET /api/auth/oauth/[provider], then writes session cookies on
 * the /feed redirect. Browser rehydrate via GET /api/auth/me.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=auth`)
  }

  const redirectTo = NextResponse.redirect(`${origin}/feed`)

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
            redirectTo.cookies.set(name, value, options)
          })
          Object.entries(headers).forEach(([key, value]) => {
            redirectTo.headers.set(key, value)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('exchangeCodeForSession failed:', error.message)
    return NextResponse.redirect(`${origin}/signin?error=auth`)
  }

  return redirectTo
}
