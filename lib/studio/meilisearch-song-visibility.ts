import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { deleteMargoDocuments, upsertMargoDocuments } from '@/lib/meilisearch/client'
import { lyricLineToCatalogDoc, songToSearchDoc } from '@/lib/meilisearch/documents'

/**
 * Keep Meilisearch catalog in sync when a song is hidden, restored, or deleted.
 * Best-effort — failures are logged and do not fail the HTTP handler.
 */
export async function syncSongMeilisearchVisibility(songId: string): Promise<void> {
  try {
    const admin = getSupabaseAdmin()
    const { data: song, error: songErr } = await admin
      .from('songs')
      .select('id, title, artist_display_name, artwork_url, owner_profile_id, status, deleted_at')
      .eq('id', songId)
      .maybeSingle()
    if (songErr || !song) return

    const publicCatalog =
      (song.status === 'live' || song.status === 'coming_soon') && !song.deleted_at

    if (!publicCatalog) {
      const ids = [`song:${songId}`]
      const { data: lines } = await admin
        .from('lyric_lines')
        .select('line_index')
        .eq('song_id', songId)
      for (const row of lines || []) {
        ids.push(`line:${songId}:${row.line_index}`)
      }
      await deleteMargoDocuments(ids)
      return
    }

    await upsertMargoDocuments([songToSearchDoc(song as any)])

    const { data: rows } = await admin
      .from('lyric_lines')
      .select(`
        song_id, line_index, text,
        songs!inner ( title, artist_display_name, artwork_url, status, deleted_at, song_stats ( plays ) )
      `)
      .eq('song_id', songId)

    const docs: ReturnType<typeof lyricLineToCatalogDoc>[] = []
    for (const row of rows || []) {
      const doc = lyricLineToCatalogDoc(row as any)
      if (doc) docs.push(doc)
    }
    if (docs.length) await upsertMargoDocuments(docs)
  } catch (e) {
    console.warn('[meilisearch song sync]', songId, e)
  }
}
