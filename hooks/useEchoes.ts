'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { applyEchoContentRemoved } from '@/lib/post-content-removed'
import {
  applyEchoListDeleteOutcome,
  type LyricBackDeleteOutcome,
} from '@/lib/lyric-back-owner-delete-local'
import {
  applyEchoListEditPatch,
  type LyricBackEditPatch,
} from '@/lib/lyric-back-owner-edit-local'

const supabase = createClient()

export interface Echo {
  id: string
  lyric: string
  song: string
  artist: string
  emotion: string
  username: string
  displayName?: string
  authorUid?: string
  authorAvatarUrl?: string | null
  timestamp: number
  /** @deprecated Prefer resonateCount from post_stats — kept for optimistic UI during Step 3 migration */
  resonates?: Record<string, boolean>
  resonateCount?: number
  echoCount?: number
  status?: string
  songId?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  audioUrl?: string | null
  artwork?: string | null
  externalListenUrl?: string | null
  contentRemovedAt?: string | null
}

// ── Migrated Aug 1, 2026 ───────────────────────────────────────────────
// Echoes used to live nested at Firebase posts/{postId}/echoes. They're
// now real rows in the Supabase `posts` table with parent_post_id set to
// the parent's id — this hook just queries that instead. Kept the same
// Echo interface/field names (lyric, song, artist) so lyric-back/page.tsx
// doesn't need further changes beyond what's already been done.
//
// Aug 2026 (postcard unification): also select song_id / snippet timing /
// songs.audio_url so Lyric Backs can render Tier1 audio via shared PostCard.
// resonateCount/echoCount come from post_stats (same source as the feed).

/** Supabase select for Lyric Back reply rows (feed panel + post page). */
export const ECHO_SELECT = `
  id,
  text,
  song_title,
  artist_name,
  artwork_url,
  emotion,
  status,
  song_id,
  snippet_start_sec,
  snippet_end_sec,
  external_listen_url,
  content_removed_at,
  legacy_author_label,
  author_profile_id,
  created_at,
  profiles:author_profile_id ( username, display_name, avatar_url ),
  post_resonates ( actor_id ),
  post_stats ( resonate_count, echo_count ),
  songs:song_id ( audio_url, artwork_url )
`

function mapRow(row: any): Echo {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const stats = Array.isArray(row.post_stats) ? row.post_stats[0] : row.post_stats
  const linkedSong = Array.isArray(row.songs) ? row.songs[0] : row.songs
  const resonateRows: { actor_id: string }[] = row.post_resonates || []
  const resonates: Record<string, boolean> = {}
  for (const r of resonateRows) resonates[r.actor_id] = true

  return applyEchoContentRemoved({
    id: row.id,
    lyric: row.text || '',
    song: row.song_title || '',
    artist: row.artist_name || '',
    emotion: row.emotion || '',
    username: profile?.username ?? row.legacy_author_label ?? 'Anonymous',
    displayName: profile?.display_name ?? undefined,
    authorUid: row.author_profile_id ?? undefined,
    authorAvatarUrl: profile?.avatar_url ?? null,
    timestamp: row.created_at ? new Date(row.created_at).getTime() : 0,
    resonates,
    resonateCount: stats?.resonate_count ?? Object.keys(resonates).length,
    echoCount: stats?.echo_count ?? 0,
    status: row.status,
    songId: row.song_id ?? null,
    snippetStart: row.snippet_start_sec ?? null,
    snippetEnd: row.snippet_end_sec ?? null,
    audioUrl: linkedSong?.audio_url ?? null,
    artwork: row.artwork_url ?? linkedSong?.artwork_url ?? null,
    externalListenUrl: row.external_listen_url ?? null,
    contentRemovedAt: row.content_removed_at ?? null,
  })
}

export function useEchoes(postId: string | null) {
  const [echoes, setEchoes] = useState<Echo[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (id: string) => {
    // Ordered newest-first directly — the old Firebase version relied on
    // ascending push-key order then .reverse()'d the array client-side;
    // an explicit descending order does the same thing in one step.
    const { data, error } = await supabase
      .from('posts')
      .select(ECHO_SELECT)
      .eq('parent_post_id', id)
      .not('status', 'in', '("hidden","private")')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('useEchoes: failed to load echoes', error)
      setEchoes([])
      setLoading(false)
      return
    }
    let mapped = (data ?? []).map(mapRow)
    const missingAudioIds = [
      ...new Set(
        mapped
          .filter((e) => e.songId && !e.audioUrl)
          .map((e) => e.songId as string),
      ),
    ]
    if (missingAudioIds.length > 0) {
      const { data: songs, error: songsErr } = await supabase
        .from('songs')
        .select('id, audio_url, artwork_url')
        .in('id', missingAudioIds)
      if (!songsErr && songs?.length) {
        const byId = new Map(songs.map((s) => [s.id, s]))
        mapped = mapped.map((e) => {
          if (!e.songId || e.audioUrl) return e
          const song = byId.get(e.songId)
          if (!song) return e
          return {
            ...e,
            audioUrl: song.audio_url ?? e.audioUrl,
            artwork: e.artwork ?? song.artwork_url ?? null,
          }
        })
      }
    }
    setEchoes(mapped)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!postId) {
      setEchoes([])
      setLoading(false)
      return
    }
    setLoading(true)
    load(postId)

    // Requires Realtime enabled on `posts` and `post_resonates` (Database
    // → Replication) — same caveat as usePosts/usePost. Without it the
    // list just won't live-update; initial load still works.
    const channel = supabase
      .channel(`echoes-${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `parent_post_id=eq.${postId}` },
        () => load(postId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_resonates' },
        () => load(postId)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId, load])

  const refetch = useCallback(() => {
    if (!postId) return
    void load(postId)
  }, [postId, load])

  const applyOwnerDeleteOutcome = useCallback(
    (echoId: string, outcome: LyricBackDeleteOutcome) => {
      setEchoes((prev) => applyEchoListDeleteOutcome(prev, echoId, outcome))
    },
    [],
  )

  const applyOwnerEditOutcome = useCallback((echoId: string, patch: LyricBackEditPatch) => {
    setEchoes((prev) => applyEchoListEditPatch(prev, echoId, patch))
  }, [])

  return { echoes, loading, refetch, applyOwnerDeleteOutcome, applyOwnerEditOutcome }
}
