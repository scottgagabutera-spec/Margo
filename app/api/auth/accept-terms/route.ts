import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseCookieOptions } from '@/lib/supabase/cookie-options'
import { recordTermsAndHealProfile } from '@/lib/auth-account-heal'
import {
  applyPendingSessionCookies,
  type PendingSessionCookie,
} from '@/lib/supabase/pending-session-cookies'

/**
 * Record Terms + Privacy acceptance for a signed-in user (OAuth completion step).
 * Session cookies are attached explicitly on the JSON response (OAuth pattern).
 */
export async function POST(req: NextRequest) {
  let body: { acceptedTerms?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.acceptedTerms !== true) {
    return NextResponse.json(
      { error: 'You must agree to the Terms of Service and Privacy Policy.' },
      { status: 400 },
    )
  }

  const pendingCookies: PendingSessionCookie[] = []
  const pendingHeaders: [string, string][] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return req.cookies.getAll()
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

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const healed = await recordTermsAndHealProfile(supabase, user)
  if (!healed.ok) {
    return NextResponse.json(
      { error: healed.error || 'Could not save. Try again.' },
      { status: 400 },
    )
  }

  const response = NextResponse.json({ ok: true })
  applyPendingSessionCookies(response, pendingCookies, pendingHeaders)
  return response
}
