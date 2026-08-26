import type { SupabaseClient } from '@supabase/supabase-js'
import { matchLyricLine } from '@/lib/lyric-match'
import { POST_LINES_MAX, type PostLineSource } from '@/lib/post-lines'

export type MomentPersistLine = {
  lyric: string
  songName: string
  artistName: string
  linkedSongId?: string | null
  linkedAudioUrl?: string | null
  artwork?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  source?: string | null
  geniusId?: string | null
  externalListenUrl?: string | null
}

export type PersistMomentPostInput = {
  lines: MomentPersistLine[]
  /** Stored emotion enum key (e.g. GRATEFUL) — same as Compose. */
  emotion: string | null
  status: 'active' | 'private'
  authorId: string
  lang?: string
}

export type PersistMomentPostResult = {
  postId: string
}

function lineSource(line: MomentPersistLine): PostLineSource {
  if (line.linkedSongId) return 'catalog'
  if (line.source === 'margo') return 'catalog'
  if (line.source === 'genius' || line.source === 'apple') return 'external'
  return 'freeform'
}

/**
 * Create a persisted Moment (posts + post_lines) — shared by Compose and Stage Send.
 * Mirrors compose/page.tsx handlePost insert behavior.
 */
export async function persistMomentPost(
  supabase: SupabaseClient,
  input: PersistMomentPostInput,
): Promise<PersistMomentPostResult> {
  const lines = input.lines.filter(
    (l) => l.lyric.trim() && l.songName.trim() && l.artistName.trim(),
  )
  if (lines.length === 0) {
    throw new Error('At least one complete lyric line is required')
  }
  if (lines.length > POST_LINES_MAX) {
    throw new Error(`Moments can hold up to ${POST_LINES_MAX} lines.`)
  }

  const resolvedLines: MomentPersistLine[] = []
  for (const line of lines) {
    let resolvedStart = line.snippetStart ?? null
    let resolvedEnd = line.snippetEnd ?? null
    if ((resolvedStart == null || resolvedEnd == null) && line.linkedSongId) {
      const match = await matchLyricLine(supabase, line.linkedSongId, line.lyric)
      if (match) {
        resolvedStart = match.startSec
        resolvedEnd = match.endSec
      }
    }
    resolvedLines.push({ ...line, snippetStart: resolvedStart, snippetEnd: resolvedEnd })
  }

  const mirror = resolvedLines[0]
  const { data, error: insertErr } = await supabase
    .from('posts')
    .insert({
      text: mirror.lyric,
      emotion: input.emotion,
      status: input.status,
      flag_count: 0,
      song_id: mirror.linkedSongId || null,
      song_title: mirror.songName,
      artist_name: mirror.artistName,
      artwork_url: mirror.artwork || null,
      genius_id: mirror.geniusId || null,
      external_listen_url: mirror.externalListenUrl || null,
      author_profile_id: input.authorId,
      parent_post_id: null,
      lang: input.lang || 'en',
      snippet_start_sec: mirror.snippetStart,
      snippet_end_sec: mirror.snippetEnd,
    })
    .select('id')
    .single()

  if (insertErr) throw insertErr

  const postId = data.id as string

  const lineRows = resolvedLines.map((line, position) => ({
    post_id: postId,
    position,
    text: line.lyric,
    song_id: line.linkedSongId || null,
    song_title: line.songName,
    artist_name: line.artistName,
    artwork_url: line.artwork || null,
    snippet_start_sec: line.snippetStart,
    snippet_end_sec: line.snippetEnd,
    source: lineSource(line),
  }))

  const { error: linesErr } = await supabase.from('post_lines').insert(lineRows)
  if (linesErr) {
    console.error('persistMomentPost: post_lines insert failed:', linesErr)
    const { error: deleteErr } = await supabase.from('posts').delete().eq('id', postId)
    if (deleteErr) {
      console.error('persistMomentPost: orphan post cleanup failed:', deleteErr)
    }
    throw linesErr
  }

  fetch('/api/moderate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: mirror.lyric, postId }),
  }).catch(() => {})

  return { postId }
}
