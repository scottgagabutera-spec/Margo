import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildLegalConsentSettings,
  mergeLegalConsentIntoSettings,
} from '@/lib/legal/consent'

/**
 * Record Terms + Privacy acceptance for a signed-in user (OAuth completion step).
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

  const supabase = await createClient()
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

  return NextResponse.json({ ok: true })
}
