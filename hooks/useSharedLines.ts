'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface SharedLine {
  id: string
  line: string
  uses: number
  resonates: number
  score: number
}

function normalize(str: string | null | undefined) {
  return (str || '').toLowerCase().trim()
}

// ── Migrated Aug 1, 2026 — HONEST NOTE, NOT A FULL FIX ─────────────────
// The plan doc's original vision for this hook was a real Postgres query
// like `where song_id = $1 group by text` — a true FK join instead of a
// tree scan. That's NOT what's implemented here, and it's not an
// oversight: only ~12 of 133 migrated posts actually carry a real
// song_id (confirmed via direct query during the posts migration — 121
// have song_title text but no song_id link, since most predate the
// self-serve catalog). A song_id-only query would silently exclude the
// vast majority of real historical shared-line data.
//
// So this keeps the SAME fuzzy substring matching strategy the Firebase
// version used (song/artist text overlap, not a real join), just against
// Supabase instead of a Firebase tree scan. It is a faithful behavioral
// port, not the schema-clean version the plan doc envisioned — that
// upgrade only becomes safe once song_id is reliably populated across
// historical posts, which isn't the case yet.
//
// This also still fetches every top-level post and filters client-side,
// same scale tradeoff as usePosts/the feed's post_stats fetch — fine at
// current volume (133 posts), worth revisiting with a real query once
// song_id coverage improves or post volume grows meaningfully.
export function useSharedLines(song: string | null | undefined, artist: string | null | undefined) {
  const [lines, setLines] = useState<SharedLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!song || !artist) { setLoading(false); return }
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('posts')
        .select('text, song_title, artist_name, post_stats ( resonate_count )')
        .is('parent_post_id', null)
        .not('status', 'in', '("hidden","private")')
        .not('text', 'is', null)

      if (cancelled) return
      if (error) {
        console.error('useSharedLines: failed to load posts', error)
        setLines([])
        setLoading(false)
        return
      }

      const targetSong = normalize(song)
      const targetArtist = normalize(artist)
      const counts: Record<string, { uses: number; resonates: number }> = {}

      for (const row of (data as any[]) || []) {
        const postSong = normalize(row.song_title || '')
        const postArtist = normalize(row.artist_name || '')
        const songMatch = postSong.includes(targetSong) || targetSong.includes(postSong)
        const artistMatch = postArtist.includes(targetArtist) || targetArtist.includes(postArtist)
        if (!songMatch || !artistMatch) continue

        const text = (row.text || '').trim()
        if (!text) continue

        const stats = Array.isArray(row.post_stats) ? row.post_stats[0] : row.post_stats
        if (!counts[text]) counts[text] = { uses: 0, resonates: 0 }
        counts[text].uses += 1
        counts[text].resonates += stats?.resonate_count || 0
      }

      const ranked: SharedLine[] = Object.entries(counts)
        .map(([line, d], i) => ({
          id: String(i),
          line,
          uses: d.uses,
          resonates: d.resonates,
          score: d.uses * 2 + d.resonates,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)

      setLines(ranked)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [song, artist])

  return { lines, loading }
}