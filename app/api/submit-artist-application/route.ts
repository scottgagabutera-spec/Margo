import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizeSunoUrl } from '@/lib/suno'

export const runtime = 'nodejs'

// Session is resolved from the auth cookie via @supabase/ssr first.
// profile_id is never trusted from the request body — always derived
// from the verified user, so a request can never claim to apply on
// someone else's behalf.

async function checkSunoCode(url: string, code: string): Promise<boolean> {
  try {
    // Accept a bare handle here too, same as /api/verify-artist-link —
    // this is the route that actually decides approval, so it can't
    // rely on the browser having already normalized the value.
    const normalizedUrl = normalizeSunoUrl(url)
    const parsed = new URL(normalizedUrl)
    if (!/(^|\.)suno\.com$/.test(parsed.hostname)) return false
    const res = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MargoVerifyBot/1.0)' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return false
    const html = await res.text()
    return html.includes(code)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  // Prefer cookie session (Phase 3).
  const supabase = await createServerSupabase()
  let profileId: string | null = null
  const { data: cookieUserData, error: cookieUserErr } = await supabase.auth.getUser()
  if (!cookieUserErr && cookieUserData?.user) {
    profileId = cookieUserData.user.id
  }

  // TEMPORARY: Bearer fallback for callers not yet migrated to cookie auth.
  // Remove once settings/page.tsx and useArtistApplication.ts are migrated (Phase 5).
  if (!profileId) {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (token) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (url && anonKey) {
        const bearerClient = createClient(url, anonKey)
        const { data: bearerUserData, error: bearerErr } =
          await bearerClient.auth.getUser(token)
        if (!bearerErr && bearerUserData?.user) {
          profileId = bearerUserData.user.id
        }
      }
    }
  }

  if (!profileId) {
    return NextResponse.json({ success: false, error: 'Not signed in.' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { applicantType, displayArtistName, links, note, rightsAgreed, sunoVerification } = body || {}

  const name = String(displayArtistName || '').trim()
  if (!name) {
    return NextResponse.json({ success: false, error: 'Artist name is required.' }, { status: 400 })
  }
  if (!rightsAgreed) {
    return NextResponse.json({ success: false, error: 'You must agree to the rights warranty to continue.' }, { status: 400 })
  }

  const cleanedLinks: Record<string, string> = {}
  for (const [key, value] of Object.entries(links || {})) {
    if (typeof value === 'string' && value.trim()) cleanedLinks[key] = value.trim()
  }

  // Store the fully-normalized Suno URL, not whatever partial handle the
  // artist typed — so the admin tab and any future re-checks always see
  // a real, clickable profile link.
  if (cleanedLinks.suno) {
    cleanedLinks.suno = normalizeSunoUrl(cleanedLinks.suno)
  }

  if (Object.keys(cleanedLinks).length === 0) {
    return NextResponse.json({ success: false, error: 'Add at least one link so we can verify you.' }, { status: 400 })
  }

  const type = applicantType === 'label' ? 'label' : 'independent'

  // Independently re-check the Suno code server-side — never trust a
  // client claim of "already verified." This is the one place the
  // approval decision is actually made.
  let verified = false
  if (type === 'independent' && sunoVerification?.code && cleanedLinks.suno) {
    verified = await checkSunoCode(cleanedLinks.suno, sunoVerification.code)
  }

  const admin = getSupabaseAdmin()

  const { data: inserted, error: insertErr } = await admin
    .from('artist_applications')
    .insert({
      profile_id: profileId,
      applicant_type: type,
      display_artist_name: name,
      links: cleanedLinks,
      note: note?.trim() || null,
      rights_agreed: true,
      verification_method: verified ? 'suno' : null,
      verification_code: verified ? sunoVerification.code : null,
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    return NextResponse.json({ success: false, error: 'Could not submit application.' }, { status: 500 })
  }

  let status: 'pending' | 'approved' = 'pending'
  let verifiedAt: string | null = null

  if (verified) {
    const now = new Date().toISOString()
    const { error: approveErr } = await admin
      .from('artist_applications')
      .update({ status: 'approved', verified_at: now })
      .eq('id', inserted.id)

    if (!approveErr) {
      status = 'approved'
      verifiedAt = now
    }
    // If this update fails, the application still exists as 'pending' —
    // falls through to manual review instead of the submission being lost.
  }

  return NextResponse.json({ success: true, status, verifiedAt })
}