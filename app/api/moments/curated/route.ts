import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isMomentsCurationEnabled } from '@/lib/moments/curation-config'
import type { CuratedMomentStored } from '@/lib/moments/curated-types'

export const runtime = 'nodejs'

/** GET ?songId= — read cached curated moments (authenticated). */
export async function GET(request: NextRequest) {
  if (!isMomentsCurationEnabled()) {
    return NextResponse.json({ moments: [] })
  }

  const songId = request.nextUrl.searchParams.get('songId')?.trim() || ''
  if (!songId) {
    return NextResponse.json({ error: 'songId required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('song_curated_moments')
    .select('moments, lyrics_checksum, updated_at')
    .eq('song_id', songId)
    .maybeSingle()

  if (error) {
    console.error('moments/curated read failed', error)
    return NextResponse.json({ error: 'Read failed' }, { status: 500 })
  }

  const moments = (data?.moments || []) as CuratedMomentStored[]
  return NextResponse.json({
    moments,
    lyricsChecksum: data?.lyrics_checksum ?? null,
    updatedAt: data?.updated_at ?? null,
  })
}
