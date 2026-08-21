import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { deleteMargoDocuments, upsertMargoDocuments } from './client'
import {
  lyricLineToCatalogDoc,
  postToLyricDoc,
  profileToArtistDoc,
  profileToUserDoc,
} from './documents'
import type { MargoSearchDocument } from './types'

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
}

export async function fetchAllMargoSearchDocuments(): Promise<MargoSearchDocument[]> {
  const admin = getSupabaseAdmin()
  const docs: MargoSearchDocument[] = []

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, display_name, avatar_url, is_artist')

  for (const row of profiles || []) {
    const user = profileToUserDoc(row as any)
    if (user) docs.push(user)
    if ((row as any).is_artist) {
      const artist = profileToArtistDoc(row as any)
      if (artist) docs.push(artist)
    }
  }

  const { data: posts } = await admin
    .from('posts')
    .select(`
      id, text, emotion, song_title, artist_name, artwork_url, song_id,
      legacy_author_label, created_at, status, parent_post_id,
      profiles:author_profile_id ( username, display_name ),
      post_stats ( resonate_count ),
      post_lines ( position, text )
    `)
    .eq('status', 'active')
    .is('parent_post_id', null)

  for (const row of posts || []) {
    const stats = Array.isArray((row as any).post_stats)
      ? (row as any).post_stats[0]
      : (row as any).post_stats
    const doc = postToLyricDoc({
      ...(row as any),
      resonate_count: stats?.resonate_count ?? 0,
    })
    if (doc) docs.push(doc)
  }

  const { data: lines } = await admin
    .from('lyric_lines')
    .select(`
      song_id, line_index, text,
      songs!inner (
        title, artist_display_name, artwork_url, status,
        song_stats ( plays )
      )
    `)
    .eq('songs.status', 'live')

  for (const row of lines || []) {
    const doc = lyricLineToCatalogDoc(row as any)
    if (doc) docs.push(doc)
  }

  return docs
}

export async function syncMargoSearchFromWebhook(payload: WebhookPayload): Promise<void> {
  const { type, table, record, old_record } = payload
  const row = record || old_record
  if (!row) return

  if (type === 'DELETE') {
    const ids: string[] = []
    if (table === 'profiles') {
      const id = String(row.id)
      ids.push(`user:${id}`, `artist:${id}`)
    } else if (table === 'posts') {
      ids.push(`post:${row.id}`)
    } else if (table === 'lyric_lines') {
      ids.push(`line:${row.song_id}:${row.line_index}`)
    }
    await deleteMargoDocuments(ids)
    return
  }

  const docs: MargoSearchDocument[] = []

  if (table === 'profiles') {
    const user = profileToUserDoc(row as any)
    if (user) docs.push(user)
    if ((row as any).is_artist) {
      const artist = profileToArtistDoc(row as any)
      if (artist) docs.push(artist)
    } else {
      await deleteMargoDocuments([`artist:${row.id}`])
    }
  } else if (table === 'posts') {
    if ((row as any).status !== 'active' || (row as any).parent_post_id) {
      await deleteMargoDocuments([`post:${row.id}`])
      return
    }
    // The webhook payload is the raw posts row only — no join capability,
    // unlike the full-sync query above. A dedicated post_lines fetch here
    // keeps the incremental path consistent with full sync instead of
    // silently re-indexing only the position-0 mirror on every edit.
    const admin = getSupabaseAdmin()
    const { data: postLines } = await admin
      .from('post_lines')
      .select('position, text')
      .eq('post_id', row.id)
    const doc = postToLyricDoc({ ...(row as any), post_lines: postLines || [] })
    if (doc) docs.push(doc)
  } else if (table === 'lyric_lines') {
    const admin = getSupabaseAdmin()
    const { data } = await admin
      .from('lyric_lines')
      .select(`
        song_id, line_index, text,
        songs!inner ( title, artist_display_name, artwork_url, status, song_stats ( plays ) )
      `)
      .eq('song_id', row.song_id)
      .eq('line_index', row.line_index)
      .maybeSingle()
    const doc = data ? lyricLineToCatalogDoc(data as any) : null
    if (doc) docs.push(doc)
  }

  await upsertMargoDocuments(docs)
}
