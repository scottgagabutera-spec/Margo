import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { curateSongMoments } from '@/lib/moments/curate-song'
import { isMomentsCurationEnabled } from '@/lib/moments/curation-config'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * POST { songId: string, force?: boolean }
 * Server-only gpt-4o-mini curation; caches in song_curated_moments (service role).
 */
export async function POST(request: NextRequest) {
  if (!isMomentsCurationEnabled()) {
    return NextResponse.json({ status: 'disabled', moments: [] })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const songId = typeof body?.songId === 'string' ? body.songId.trim() : ''
    const force = body?.force === true
    if (!songId) {
      return NextResponse.json({ error: 'songId required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const result = await curateSongMoments({
      supabaseAdmin: admin,
      songId,
      userId: user.id,
      force,
      writeCache: true,
    })

    if (result.status === 'failed') {
      return NextResponse.json({ status: 'failed', reason: result.reason, moments: [] }, { status: 502 })
    }

    if (result.status === 'disabled') {
      return NextResponse.json({ status: 'disabled', moments: [] })
    }

    return NextResponse.json({
      status: result.status,
      moments: result.moments,
      lyricsChecksum: result.lyricsChecksum,
    })
  } catch (err) {
    console.error('moments/curate failed', err)
    return NextResponse.json({ error: 'Curation failed' }, { status: 500 })
  }
}
