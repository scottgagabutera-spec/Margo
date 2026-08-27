import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildLegalConsentSettings, mergeLegalConsentIntoSettings } from '@/lib/legal/consent'

/**
 * Auth core — password sign-up on the server (httpOnly cookies when a
 * session is returned). Never returns refresh_token.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; acceptedTerms?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = body.email?.trim()
  const password = body.password
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  }

  if (body.acceptedTerms !== true) {
    return NextResponse.json(
      { error: 'You must agree to the Terms of Service and acknowledge the Privacy Policy to create an account.' },
      { status: 400 },
    )
  }

  const legal = buildLegalConsentSettings()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        terms_accepted_at: legal.termsAcceptedAt,
        terms_version: legal.termsVersion,
      },
    },
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data.session?.access_token || !data.user) {
    // Email confirmation required — account created, no session yet.
    return NextResponse.json({
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email ?? null,
            is_anonymous: data.user.is_anonymous ?? false,
          }
        : null,
      access_token: null,
      needs_confirmation: true,
    })
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      is_anonymous: data.user.is_anonymous ?? false,
    },
    access_token: data.session.access_token,
    needs_confirmation: false,
  })
}
