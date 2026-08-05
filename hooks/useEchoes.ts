'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface Echo {
  id: string
  lyric: string
  song: string
  artist: string
  emotion: string
  username: string
  displayName?: string
  authorUid?: string
  timestamp: number
  resonates?: Record<string, boolean>
  status?: string
}

// ── Migrated Aug 1, 2026 ───────────────────────────────────────────────
// Echoes used to live nested at Firebase posts/{postId}/echoes. They're
// now real rows in the Supabase `posts` table with parent_post_id set to
// the parent's id — this hook just queries that instead. Kept the same
// Echo interface/field names (lyric, song, artist) so lyric-back/page.tsx
// doesn't need further changes beyond what's already been done.
//
// `resonates` is rebuilt as a Record<actorId, true> from the joined
// post_resonates rows, matching the old Firebase shape exactly, since
// the page's optimistic-update logic (Object.keys(...).length) depends
// on that shape rather than a plain count.

const ECHO_SELECT = `
  id,
  text,
  song_title,
  artist_name,
  emotion,
  status,
  legacy_author_label,
  author_profile_id,
  created_at,
  profiles:author_profile_id ( username, display_name ),
  post_resonates ( actor_id )
`

function mapRow(row: any): Echo {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const resonateRows: { actor_id: string }[] = row.post_resonates || []
  const resonates: Record<string, boolean> = {}
  for (const r of resonateRows) resonates[r.actor_id] = true

  return {
    id: row.id,
    lyric: row.text || '',
    song: row.song_title || '',
    artist: row.artist_name || '',
    emotion: row.emotion || '',
    username: profile?.username ?? row.legacy_author_label ?? 'Anonymous',
    displayName: profile?.display_name ?? undefined,
    authorUid: row.author_profile_id ?? undefined,
    timestamp: row.created_at ? new Date(row.created_at).getTime() : 0,
    resonates,
    status: row.status,
  }
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
    setEchoes((data ?? []).map(mapRow))
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

  return { echoes, loading }
}