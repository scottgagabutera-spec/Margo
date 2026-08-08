import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseCookieOptions } from '@/lib/supabase/cookie-options'

const ALLOWED = new Set(['google', 'discord'] as const)
type OAuthProvider = 'google' | 'discord'

/**
 * Auth core — server-initiated OAuth PKCE start.
 * Generates the code verifier server-side, sets it as an httpOnly cookie
 * on the provider redirect, then sends the browser to Google/Discord.
 * Callback: app/auth/callback/route.ts
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: raw } = await context.params
  const origin = new URL(request.url).origin

  if (!ALLOWED.has(raw as OAuthProvider)) {
    return NextResponse.redirect(`${origin}/signin?error=auth`)
  }
  const provider = raw as OAuthProvider

  // Collect Set-Cookie during signInWithOAuth, then attach to the final redirect.
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

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
    },
  })

  if (error || !data.url) {
    console.error('signInWithOAuth failed:', error?.message || 'no url')
    return NextResponse.redirect(`${origin}/signin?error=auth`)
  }

  const redirect = NextResponse.redirect(data.url)
  pendingCookies.forEach(({ name, value, options }) => {
    redirect.cookies.set(name, value, options)
  })
  pendingHeaders.forEach(([key, value]) => {
    redirect.headers.set(key, value)
  })
  return redirect
}
