/**
 * Library song shelves — Liked + Listen Later (D1 / D2 / S1).
 * Private per-user rows; Phase D Library UI reads the same tables.
 */

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function fetchLikedSongIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('liked_songs')
    .select('song_id')
    .eq('user_id', userId)
  if (error) {
    console.error('failed to load liked songs', error)
    return []
  }
  return (data || []).map(r => r.song_id as string)
}

export async function fetchListenLaterSongIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('listen_later_songs')
    .select('song_id')
    .eq('user_id', userId)
  if (error) {
    console.error('failed to load listen later', error)
    return []
  }
  return (data || []).map(r => r.song_id as string)
}

/** Toggle Library Like. Returns the new liked state, or null on failure. */
export async function toggleLikedSong(
  userId: string,
  songId: string,
  currentlyLiked: boolean,
): Promise<boolean | null> {
  if (currentlyLiked) {
    const { error } = await supabase
      .from('liked_songs')
      .delete()
      .eq('user_id', userId)
      .eq('song_id', songId)
    if (error) {
      console.error('failed to unlike song', error)
      return null
    }
    return false
  }
  const { error } = await supabase
    .from('liked_songs')
    .insert({ user_id: userId, song_id: songId })
  if (error) {
    console.error('failed to like song', error)
    return null
  }
  return true
}

type SongEmbed = {
  id: string
  title: string
  artist_display_name: string
  artwork_url: string | null
  audio_url: string | null
  status: string | null
  is_ai_generated: boolean
}

function unwrapSong(raw: SongEmbed | SongEmbed[] | null | undefined): SongEmbed | null {
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

export type LibrarySongRow = {
  id: string
  title: string
  artist: string
  artwork: string | null
  audioUrl: string | null
  status: string | null
  isAiGenerated: boolean
}

function toLibrarySong(embed: SongEmbed): LibrarySongRow {
  return {
    id: embed.id,
    title: embed.title,
    artist: embed.artist_display_name,
    artwork: embed.artwork_url,
    audioUrl: embed.audio_url,
    status: embed.status,
    isAiGenerated: embed.is_ai_generated ?? false,
  }
}

async function fetchShelfSongs(
  table: 'liked_songs' | 'listen_later_songs',
  userId: string,
): Promise<LibrarySongRow[]> {
  const { data, error } = await supabase
    .from(table)
    .select('created_at, songs(id, title, artist_display_name, artwork_url, audio_url, status, is_ai_generated)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error(`failed to load ${table}`, error)
    return []
  }
  const out: LibrarySongRow[] = []
  for (const row of data || []) {
    const song = unwrapSong(row.songs as SongEmbed | SongEmbed[] | null)
    if (!song) continue
    out.push(toLibrarySong(song))
  }
  return out
}

export function fetchLikedSongs(userId: string): Promise<LibrarySongRow[]> {
  return fetchShelfSongs('liked_songs', userId)
}

export function fetchListenLaterSongs(userId: string): Promise<LibrarySongRow[]> {
  return fetchShelfSongs('listen_later_songs', userId)
}

/** Toggle Listen Later. Returns the new saved state, or null on failure. */
export async function toggleListenLaterSong(
  userId: string,
  songId: string,
  currentlySaved: boolean,
): Promise<boolean | null> {
  if (currentlySaved) {
    const { error } = await supabase
      .from('listen_later_songs')
      .delete()
      .eq('user_id', userId)
      .eq('song_id', songId)
    if (error) {
      console.error('failed to remove listen later', error)
      return null
    }
    return false
  }
  const { error } = await supabase
    .from('listen_later_songs')
    .insert({ user_id: userId, song_id: songId })
  if (error) {
    console.error('failed to add listen later', error)
    return null
  }
  return true
}
