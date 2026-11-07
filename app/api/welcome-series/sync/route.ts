import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isWelcomeSeriesDevOverrideAllowed } from '@/lib/welcome-series/time'
import { runWelcomeSeriesSync } from '@/lib/welcome-series/run-sync'
import { mergeWelcomeSeriesOnboarding } from '@/lib/welcome-series/merge-flags'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { ProfileSettingsJson } from '@/lib/welcome-profile-settings'

export const runtime = 'nodejs'

type Body = { devHoursSinceWelcome?: number }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  let devOverrideHours: number | null = null
  if (isWelcomeSeriesDevOverrideAllowed()) {
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        const body = (await req.json()) as Body
        if (typeof body?.devHoursSinceWelcome === 'number' && Number.isFinite(body.devHoursSinceWelcome)) {
          devOverrideHours = body.devHoursSinceWelcome
        }
      } catch {
        // empty body is fine
      }
    }
  }

  const result = await runWelcomeSeriesSync({
    profileId: user.id,
    devOverrideHours,
  })

  return NextResponse.json(result)
}

/** Mark artist-guide intent when a new-series user opens apply-artist. */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  let body: { artistGuideIntent?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (body.artistGuideIntent !== true) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: row } = await admin.from('profiles').select('settings').eq('id', user.id).maybeSingle()
  const settings = (row?.settings as ProfileSettingsJson | null) ?? {}
  const version = (settings.onboarding as { welcomeSeriesVersion?: number } | undefined)?.welcomeSeriesVersion
  if (version !== 1) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const next = mergeWelcomeSeriesOnboarding(settings, { artistGuideIntent: true })
  await admin.from('profiles').update({ settings: next }).eq('id', user.id)
  return NextResponse.json({ ok: true })
}
