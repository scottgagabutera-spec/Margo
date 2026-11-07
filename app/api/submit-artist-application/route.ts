import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizeSunoUrl } from '@/lib/suno'
import {
  cleanedArtistLinksMap,
  validateArtistApplicationLinks,
} from '@/lib/artist-application-links'
import { insertAppNotification } from '@/lib/notifications/insert-app-notification'

export const runtime = 'nodejs'

async function checkSunoCode(url: string, code: string): Promise<boolean> {
  try {
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
  const supabase = await createServerSupabase()
  const { data: cookieUserData, error: cookieUserErr } = await supabase.auth.getUser()
  const profileId = !cookieUserErr ? cookieUserData?.user?.id ?? null : null

  if (!profileId) {
    return NextResponse.json({ success: false, error: 'Not signed in.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const {
    applicantType,
    displayArtistName,
    links,
    note,
    rightsAgreed,
    sunoVerification,
  } = (body || {}) as Record<string, unknown>

  const name = String(displayArtistName || '').trim()
  if (!name) {
    return NextResponse.json({ success: false, error: 'Artist name is required.' }, { status: 400 })
  }
  if (!rightsAgreed) {
    return NextResponse.json({ success: false, error: 'You must agree to the rights warranty to continue.' }, { status: 400 })
  }

  const rawLinks = (links && typeof links === 'object' ? links : {}) as Record<string, string>
  const cleanedLinks = cleanedArtistLinksMap(rawLinks)

  if (cleanedLinks.suno) {
    cleanedLinks.suno = normalizeSunoUrl(cleanedLinks.suno)
  }

  const type = applicantType === 'label' ? 'label' : 'independent'

  const sunoCode =
    typeof sunoVerification === 'object' && sunoVerification && 'code' in sunoVerification
      ? String((sunoVerification as { code?: string }).code || '')
      : ''

  let verified = false
  if (type === 'independent' && sunoCode && cleanedLinks.suno) {
    verified = await checkSunoCode(cleanedLinks.suno, sunoCode)
  }

  const linkCheck = validateArtistApplicationLinks({ links: cleanedLinks, sunoVerified: verified })
  if (!linkCheck.ok) {
    return NextResponse.json({ success: false, error: linkCheck.error }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data: existingPending } = await admin
    .from('artist_applications')
    .select('id')
    .eq('profile_id', profileId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingPending) {
    return NextResponse.json(
      {
        success: false,
        error:
          'You already have an application under review. We will notify you here in Margo when there is a decision.',
      },
      { status: 409 },
    )
  }

  const { data: inserted, error: insertErr } = await admin
    .from('artist_applications')
    .insert({
      profile_id: profileId,
      applicant_type: type,
      display_artist_name: name,
      links: cleanedLinks,
      note: typeof note === 'string' ? note.trim() || null : null,
      rights_agreed: true,
      verification_method: verified ? 'suno' : null,
      verification_code: verified ? sunoCode : null,
    })
    .select('id')
    .single()

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json(
        {
          success: false,
          error:
            'You already have an application under review. We will notify you here in Margo when there is a decision.',
        },
        { status: 409 },
      )
    }
    return NextResponse.json({ success: false, error: 'Could not submit application.' }, { status: 500 })
  }

  if (!inserted) {
    return NextResponse.json({ success: false, error: 'Could not submit application.' }, { status: 500 })
  }

  await insertAppNotification(admin, {
    recipientId: profileId,
    type: 'artist_submitted',
    actorId: null,
  })

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
      await insertAppNotification(admin, {
        recipientId: profileId,
        type: 'artist_approved',
        actorId: null,
      })
    }
  }

  return NextResponse.json({ success: true, status, verifiedAt })
}
