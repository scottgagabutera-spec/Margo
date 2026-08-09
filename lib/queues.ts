import { createClient } from '@/lib/supabase/client'
import { getAudioEngineState } from '@/lib/audio-engine'
import type { LyricMomentQueueItem } from '@/lib/audio-engine'

const supabase = createClient()

export interface SaveQueueResult {
  queueId: string
  itemCount: number
}

/**
 * Saves the audio engine's current queue as a durable Supabase queue.
 * Resolves each item's (songId, lineIndex) to a real lyric_lines.id via one
 * batched lookup — the engine's queue items carry lineIndex (from the
 * discovery board), not the lyric_lines primary key, since the board never
 * needed the real id until now.
 */
export async function saveCurrentQueueAsPlaylist(
  title: string,
  isPublic: boolean,
  ownerId: string,
): Promise<SaveQueueResult | null> {
  if (!ownerId) return null

  const { queue } = getAudioEngineState()
  if (queue.length === 0) return null

  const lineKeys = await resolveLyricLineIds(queue)

  const { data: queueRow, error: queueErr } = await supabase
    .from('queues')
    .insert({
      owner_profile_id: ownerId,
      type: 'lyric',
      kind: 'manual',
      title,
      is_public: isPublic,
    })
    .select('id')
    .single()

  if (queueErr || !queueRow) {
    console.error('saveCurrentQueueAsPlaylist: failed to create queue', queueErr)
    return null
  }

  const items = queue.map((item, position) => ({
    queue_id: queueRow.id,
    position,
    song_id: item.songId,
    lyric_line_id: lineKeys.get(`${item.songId}_${item.lineIndex}`) ?? null,
    added_by_profile_id: ownerId,
  }))

  const { error: itemsErr } = await supabase.from('queue_items').insert(items)
  if (itemsErr) {
    console.error('saveCurrentQueueAsPlaylist: failed to insert items', itemsErr)
    await supabase.from('queues').delete().eq('id', queueRow.id)
    return null
  }

  return { queueId: queueRow.id, itemCount: items.length }
}

async function resolveLyricLineIds(
  queue: LyricMomentQueueItem[],
): Promise<Map<string, string>> {
  const songIds = Array.from(new Set(queue.map(i => i.songId)))
  const { data, error } = await supabase
    .from('lyric_lines')
    .select('id, song_id, line_index')
    .in('song_id', songIds)

  const map = new Map<string, string>()
  if (error || !data) {
    console.error('resolveLyricLineIds: lookup failed', error)
    return map
  }
  for (const row of data) {
    map.set(`${row.song_id}_${row.line_index}`, row.id)
  }
  return map
}