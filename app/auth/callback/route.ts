import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseCookieOptions } from '@/lib/supabase/cookie-options'

/**
 * OAuth PKCE callback (Google / Discord).
 * Writes httpOnly session cookies on the redirect response.
 *
 * Auth core note: OAuth *start* still requires a server-owned PKCE
 * verifier cookie (browser setAll is a no-op). Full OAuth start lands
 * in a follow-up Auth core slice — password login works via /api/auth/login.
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
