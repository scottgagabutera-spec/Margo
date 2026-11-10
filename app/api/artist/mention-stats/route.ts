import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadArtistMentionStats } from '@/lib/artist-mention-stats-server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('is_artist, artist_status')
    .eq('id', user.id)
    .maybeSingle()

  if (profErr || !profile?.is_artist) {
    return NextResponse.json({ error: 'Not an artist' }, { status: 403 })
  }

  const stats = await loadArtistMentionStats(user.id)
  return NextResponse.json(stats)
}
