import { NextResponse } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { generateCatalogMoments } from '@/lib/promote/generate-catalog-moments'
import { createPromoteQueueFromCatalogMoments } from '@/lib/promote/queue-from-catalog'
import type { CatalogLyricAtom } from '@/lib/catalog-lyric-unit'

export async function POST(request: Request) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: {
    songId?: string
    count?: number
    mode?: string
    directive?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const songId = body.songId?.trim()
  if (!songId) return NextResponse.json({ error: 'songId is required' }, { status: 400 })

  const count = Math.max(1, Math.min(3, Number(body.count) || 1))
  const mode = body.mode === 'directive' ? 'directive' : 'auto'
  const directive = body.directive?.trim() || ''

  if (mode === 'directive' && !directive) {
    return NextResponse.json({ error: 'directive is required in directive mode' }, { status: 400 })
  }

  const admin = getPromoteAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const { data: song, error: songErr } = await admin
    .from('songs')
    .select('id, title, artist_display_name, artwork_url, status, owner_profile_id')
    .eq('id', songId)
    .maybeSingle()

  if (songErr || !song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 })
  }

  if (song.owner_profile_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (song.status !== 'live') {
    return NextResponse.json({ error: 'Generate Promotion is available only for live songs.' }, { status: 400 })
  }

  const { data: lineRows, error: linesErr } = await admin
    .from('lyric_lines')
    .select('line_index, text, start_sec, end_sec')
    .eq('song_id', songId)
    .order('line_index', { ascending: true })

  if (linesErr) {
    return NextResponse.json({ error: linesErr.message }, { status: 500 })
  }

  if (!lineRows?.length) {
    return NextResponse.json({ error: 'This song has no lyric lines yet.' }, { status: 400 })
  }

  const songLines: CatalogLyricAtom[] = lineRows.map((row) => ({
    lineIndex: row.line_index,
    text: row.text,
    startSec: Number(row.start_sec),
    endSec: Number(row.end_sec),
  }))

  const { data: usedRows, error: usedErr } = await admin
    .from('promote_queue')
    .select('source_line_indexes, selection_score, created_at')
    .eq('source_song_id', songId)
    .eq('source_type', 'catalog_line')

  if (usedErr) {
    return NextResponse.json({ error: usedErr.message }, { status: 500 })
  }

  try {
    const { moments, dedupMeta } = await generateCatalogMoments({
      songTitle: song.title || '',
      artistName: song.artist_display_name || '',
      songLines,
      count,
      mode,
      directive: directive || undefined,
      usedQueueRows: usedRows || [],
    })

    const { queueIds } = await createPromoteQueueFromCatalogMoments(
      admin,
      session.userId,
      {
        id: song.id,
        title: song.title || '',
        artist_display_name: song.artist_display_name || '',
        artwork_url: song.artwork_url,
      },
      moments,
    )

    return NextResponse.json({
      queueIds,
      count: queueIds.length,
      requestedCount: count,
      returnedCount: queueIds.length,
      dedupTier: dedupMeta.tier,
      moments: moments.map((m, i) => ({
        queueId: queueIds[i],
        startLineIndex: m.startLineIndex,
        endLineIndex: m.endLineIndex,
        mood: m.mood,
        lyricText: m.lyricText,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
