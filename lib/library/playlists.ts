import { createClient } from '@/lib/supabase/client'
import {
  fullSongToQueueItem,
  playQueueIndex,
  setQueue,
  snippetToQueueItem,
  type LyricMomentQueueItem,
} from '@/lib/audio-engine'

const supabase = createClient()

export type LibraryPlaylistSummary = {
  id: string
  title: string
  type: string
  itemCount: number
  updatedAt: string
}

export type LibraryPlaylistItem = {
  position: number
  songId: string
  title: string
  artist: string
  artwork: string | null
  audioUrl: string | null
  status: string | null
  lineText: string | null
  lineIndex: number
  startSec: number
  endSec: number
  isSnippet: boolean
}

export type LibraryPlaylistDetail = {
  id: string
  title: string
  type: string
  ownerId: string
  items: LibraryPlaylistItem[]
}

type SongEmbed = {
  id: string
  title: string
  artist_display_name: string
  artwork_url: string | null
  audio_url: string | null
  status: string | null
}

type LineEmbed = {
  id: string
  text: string
  line_index: number
  start_sec: number
  end_sec: number
}

function unwrap<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

function countFromEmbed(raw: unknown): number {
  if (!raw) return 0
  if (Array.isArray(raw) && raw[0] && typeof raw[0] === 'object' && 'count' in raw[0]) {
    return Number((raw[0] as { count: number }).count) || 0
  }
  if (Array.isArray(raw)) return raw.length
  return 0
}

export async function listMyPlaylists(userId: string): Promise<LibraryPlaylistSummary[]> {
  const { data, error } = await supabase
    .from('queues')
    .select('id, title, type, updated_at, queue_items(count)')
    .eq('owner_profile_id', userId)
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('failed to list playlists', error)
    return []
  }
  return (data || []).map((row) => ({
    id: row.id as string,
    title: (row.title as string) || 'Untitled',
    type: (row.type as string) || 'lyric',
    itemCount: countFromEmbed(row.queue_items),
    updatedAt: (row.updated_at as string) || '',
  }))
}

export async function fetchPlaylistDetail(
  playlistId: string,
): Promise<LibraryPlaylistDetail | null> {
  const { data, error } = await supabase
    .from('queues')
    .select(`
      id,
      title,
      type,
      owner_profile_id,
      queue_items (
        position,
        song_id,
        lyric_line_id,
        songs (id, title, artist_display_name, artwork_url, audio_url, status),
        lyric_lines (id, text, line_index, start_sec, end_sec)
      )
    `)
    .eq('id', playlistId)
    .maybeSingle()
  if (error) {
    console.error('failed to load playlist', error)
    return null
  }
  if (!data) return null

  const rawItems = (data.queue_items as Array<{
    position: number
    song_id: string
    lyric_line_id: string | null
    songs: SongEmbed | SongEmbed[] | null
    lyric_lines: LineEmbed | LineEmbed[] | null
  }> | null) || []

  const items: LibraryPlaylistItem[] = rawItems
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((row) => {
      const song = unwrap(row.songs)
      const line = unwrap(row.lyric_lines)
      const isSnippet = !!line
      return {
        position: row.position,
        songId: song?.id || row.song_id,
        title: song?.title || '',
        artist: song?.artist_display_name || '',
        artwork: song?.artwork_url ?? null,
        audioUrl: song?.audio_url ?? null,
        status: song?.status ?? null,
        lineText: line?.text ?? null,
        lineIndex: line?.line_index ?? 0,
        startSec: Number(line?.start_sec ?? 0),
        endSec: Number(line?.end_sec ?? 0),
        isSnippet,
      }
    })
    .filter((item) => !!item.songId)

  return {
    id: data.id as string,
    title: (data.title as string) || 'Untitled',
    type: (data.type as string) || 'lyric',
    ownerId: data.owner_profile_id as string,
    items,
  }
}

function isPlayable(item: LibraryPlaylistItem): boolean {
  return !!item.audioUrl && (item.status === 'live' || item.status === 'active' || !item.status)
}

export function playlistItemsToQueue(items: LibraryPlaylistItem[]): LyricMomentQueueItem[] {
  const out: LyricMomentQueueItem[] = []
  for (const item of items) {
    if (!isPlayable(item) || !item.audioUrl) continue
    if (item.isSnippet) {
      out.push(snippetToQueueItem({
        songId: item.songId,
        audioUrl: item.audioUrl,
        title: item.title,
        artist: item.artist,
        artwork: item.artwork,
        lineIndex: item.lineIndex,
        lineText: item.lineText || '',
        startSec: item.startSec,
        endSec: item.endSec,
        vibe: null,
      }))
    } else {
      out.push(fullSongToQueueItem({
        id: item.songId,
        audioUrl: item.audioUrl,
        title: item.title,
        artist: item.artist,
        artwork: item.artwork,
      }))
    }
  }
  return out
}

/** Replace the session queue and start at a playlist row (Play all / tap). */
export function playPlaylistSession(items: LibraryPlaylistItem[], startItemIndex = 0): void {
  const queue = playlistItemsToQueue(items)
  if (queue.length === 0) return
  let qi = 0
  let k = 0
  for (let i = 0; i < items.length; i++) {
    if (!isPlayable(items[i])) continue
    if (i === startItemIndex) {
      qi = k
      break
    }
    k++
  }
  const safe = Math.max(0, Math.min(qi, queue.length - 1))
  setQueue(queue, safe)
  playQueueIndex(safe)
}
