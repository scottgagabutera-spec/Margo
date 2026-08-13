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
