import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  SUGGEST_BATCH_MAX,
  suggestLyricBacksForPosts,
} from '@/lib/suggest-lyric-back'

/**
 * POST { postIds: string[] }
 * Suggested Lyric Back via gpt-4o-mini ranking over catalog lyric units.
 * Cached per post (see suggest_lyric_back_cache).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const rawIds: unknown[] = Array.isArray(body?.postIds) ? body.postIds : []
    const postIds: string[] = [...new Set(
      rawIds.filter((id): id is string => typeof id === 'string' && id.length > 0),
    )].slice(0, SUGGEST_BATCH_MAX)

    if (postIds.length === 0) {
      return NextResponse.json({ suggestions: {} })
    }

    const supabase = getSupabaseAdmin()
    // Visible feed posts use status = 'active' (not 'public' — that filter
    // matched zero rows and made Suggested always empty).
    const { data: rows, error } = await supabase
      .from('posts')
      .select('id, emotion, text, song_id, song_title')
      .in('id', postIds)
      .eq('status', 'active')

    if (error) {
      console.error('suggest-lyric-back: posts query failed', error)
      return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
    }

    const suggestions = await suggestLyricBacksForPosts(
      supabase,
      (rows || []).map((r) => ({
        id: r.id,
        emotion: r.emotion,
        text: r.text,
        songId: r.song_id,
        songTitle: r.song_title,
      })),
    )

    // Ensure every requested id is present (empty array if unknown / private).
    for (const id of postIds) {
      if (!suggestions[id]) suggestions[id] = []
    }

    return NextResponse.json({ suggestions })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('suggest-lyric-back failed', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
