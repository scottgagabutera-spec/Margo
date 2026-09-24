import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseCookieOptions } from '@/lib/supabase/cookie-options'
import {
  buildLegalConsentSettings,
  mergeLegalConsentIntoSettings,
} from '@/lib/legal/consent'
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

  const legal = buildLegalConsentSettings()
  const { error: metaErr } = await supabase.auth.updateUser({
    data: {
      terms_accepted_at: legal.termsAcceptedAt,
      terms_version: legal.termsVersion,
    },
  })
  if (metaErr) {
    return NextResponse.json({ error: metaErr.message }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', user.id)
    .maybeSingle()

  const settings = mergeLegalConsentIntoSettings(
    (profile?.settings as Record<string, unknown> | null) ?? null,
    legal,
  )
  await supabase.from('profiles').update({ settings }).eq('id', user.id)

  const response = NextResponse.json({ ok: true })
  applyPendingSessionCookies(response, pendingCookies, pendingHeaders)
  return response
}
