import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * OAuth PKCE callback (Google / Discord).
 * Exchanges ?code= for a session and writes the auth cookie on the
 * redirect response, then sends the browser to /feed.
 *
 * Cookie I/O matches lib/supabase/server.ts (getAll/setAll), but is
 * bound to the redirect NextResponse so Set-Cookie survives the 307.
 * Replaces the old client-side page.tsx exchange.
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
