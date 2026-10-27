import type { LyricMoment } from '@/lib/lyric-moments-board'
import type { Song } from '@/hooks/useSongs'
import type { Post } from '@/hooks/usePosts'
import type { LyricMomentRow } from '@/lib/primary-tab-prefetch'

export type SongsSortMode = 'trending' | 'top' | 'az'

export function filterMomentsByVibe(moments: LyricMoment[], vibe: string): LyricMoment[] {
  if (vibe === 'ALL') return moments
  return moments.filter(m => m.vibes.includes(vibe))
}

export function filterPostsByVibe(posts: Post[], vibe: string): Post[] {
  const base = posts.filter(p => p.songId && p.text)
  if (vibe === 'ALL') return base
  return base.filter(p => (p.emotion || '').toUpperCase() === vibe)
}

export function songIdsForVibeFromMomentRows(moments: LyricMomentRow[], vibe: string): Set<string> | null {
  if (vibe === 'ALL') return null
  const ids = new Set<string>()
  for (const m of moments) {
    if (m.vibes.some(v => v.toLowerCase() === vibe.toLowerCase())) {
      ids.add(m.songId)
    }
  }
  return ids
}

export function filterSongsByVibe(songs: Song[], vibeSongIds: Set<string> | null): Song[] {
  if (!vibeSongIds) return songs
  return songs.filter(s => vibeSongIds.has(s.id))
}

export function sortSongsCatalog(songs: Song[], sort: SongsSortMode): Song[] {
  const list = [...songs]
  if (sort === 'trending') {
    return list.sort(
      (a, b) =>
        ((b.plays || 0) + (b.resonates || 0) * 3) - ((a.plays || 0) + (a.resonates || 0) * 3),
    )
  }
  if (sort === 'top') {
    return list.sort((a, b) => (b.lyricUses || 0) - (a.lyricUses || 0))
  }
  return list.sort((a, b) => a.title.localeCompare(b.title))
}

export type ArtistRow = {
  id: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  artistStatus: string | null
}

export function sortArtistsCatalog(artists: ArtistRow[]): ArtistRow[] {
  return [...artists].sort((a, b) =>
    (a.displayName || a.username || '').localeCompare(b.displayName || b.username || ''),
  )
}

export function countSongsByOwnerProfile(
  songRows: { owner_profile_id: string | null }[],
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of songRows) {
    const id = row.owner_profile_id
    if (!id) continue
    counts.set(id, (counts.get(id) || 0) + 1)
  }
  return counts
}

/** Controls allowed per view-more route (for guard tests). */
export const DISCOVER_VM_CONTROLS = {
  moments: ['vibe-chips'] as const,
  songs: ['vibe-chips', 'sort-segment'] as const,
  resonance: ['vibe-chips'] as const,
  artists: [] as const,
} as const
