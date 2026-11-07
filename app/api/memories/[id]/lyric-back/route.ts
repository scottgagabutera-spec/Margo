import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: { body?: string; songId?: string; songTitle?: string; artistName?: string; lyricExcerpt?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const text = (body.body || '').trim()
  if (text.length < 1 || text.length > 500) {
    return NextResponse.json({ error: 'Lyric back text required' }, { status: 400 })
  }

  const { error: insErr } = await supabase.from('memory_lyric_backs').insert({
    memory_id: id,
    actor_id: user.id,
    body: text,
    song_id: body.songId || null,
    song_title: body.songTitle || null,
    artist_name: body.artistName || null,
    lyric_excerpt: body.lyricExcerpt || null,
  })

  if (insErr) {
    return NextResponse.json({ error: 'Could not save lyric back' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
