import type { SupabaseClient } from '@supabase/supabase-js'
import type { ComposeSearchHit } from '@/components/compose-search-dropdown'
import { searchMargoSongs, songMatchKey } from '@/lib/search-margo-songs'

/**
 * Margo catalog + Genius + Apple Music (via /api/genius), same merge rules as Compose.
 */
export async function fetchUnifiedSongSearchHits(
  supabase: SupabaseClient,
  query: string,
  limit = 10,
): Promise<ComposeSearchHit[]> {
  const value = query.trim()
  if (value.length < 2) return []

  const [margoHits, geniusRes] = await Promise.all([
    searchMargoSongs(supabase, value, limit),
    fetch(`/api/genius?song=${encodeURIComponent(value)}`).then(async (res) => {
      if (!res.ok) return { results: [] as Record<string, unknown>[] }
      try {
        const data = await res.json()
        if (data?.error) return { results: [] as Record<string, unknown>[] }
        return data as { results?: Record<string, unknown>[] }
      } catch {
        return { results: [] as Record<string, unknown>[] }
      }
    }).catch(() => ({ results: [] as Record<string, unknown>[] })),
  ])

  const margoMapped: ComposeSearchHit[] = margoHits.map((song) => ({
    id: song.id,
    title: song.title,
    artist: song.artist,
    artwork: song.artwork || '',
    source: 'margo',
    margoSongId: song.id,
    audioUrl: song.audioUrl,
  }))

  const margoKeys = new Set(margoMapped.map((r) => songMatchKey(r.title, r.artist)))

  const externalMapped: ComposeSearchHit[] = (geniusRes.results || []).map((r) => {
    const rawSource = String(r.source || '').toLowerCase()
    const source: ComposeSearchHit['source'] =
      rawSource === 'itunes' || rawSource === 'apple' ? 'apple' : 'genius'
    const trackViewUrl = typeof r.trackViewUrl === 'string' ? r.trackViewUrl : null
    const geniusUrl = typeof r.geniusUrl === 'string' ? r.geniusUrl : null
    return {
      id: String(r.id || r.song),
      title: String(r.song ?? ''),
      artist: String(r.artist ?? ''),
      artwork: String(r.artwork || ''),
      source,
      externalListenUrl: trackViewUrl || geniusUrl || null,
    }
  }).filter((r) => r.title && !margoKeys.has(songMatchKey(r.title, r.artist)))

  return [...margoMapped, ...externalMapped].slice(0, limit)
}
