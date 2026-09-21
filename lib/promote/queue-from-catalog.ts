import type { SupabaseClient } from '@supabase/supabase-js'
import { platformsForShape } from '@/lib/promote/types'
import type { ResolvedGenerateMoment } from '@/lib/promote/generate-catalog-moments'

type SongRow = {
  id: string
  title: string
  artist_display_name: string
  artwork_url: string | null
}

/** Insert catalog_line promote rows — always pending_review (never auto-approved). */
export async function createPromoteQueueFromCatalogMoments(
  admin: SupabaseClient,
  profileId: string,
  song: SongRow,
  moments: ResolvedGenerateMoment[],
): Promise<{ queueIds: string[] }> {
  const platforms = platformsForShape('vertical')
  if (platforms.length === 0) {
    throw new Error('Vertical Shorts shape is required for generated promotions.')
  }

  const { data: connection } = await admin
    .from('artist_social_connections')
    .select('id, status')
    .eq('profile_id', profileId)
    .eq('platform', 'youtube')
    .maybeSingle()

  const queueIds: string[] = []

  for (const moment of moments) {
    const { data: queue, error: queueErr } = await admin
      .from('promote_queue')
      .insert({
        profile_id: profileId,
        status: 'pending_review',
        source_type: 'catalog_line',
        source_post_id: null,
        source_song_id: song.id,
        source_line_indexes: moment.lineIndexes,
        lyric_text: moment.lyricText,
        snippet_start_sec: moment.snippetStartSec,
        snippet_end_sec: moment.snippetEndSec,
        song_title: song.title || '',
        artist_name: song.artist_display_name || '',
        artwork_url: song.artwork_url,
        default_shape_id: 'vertical',
        default_theme_id: moment.themeId,
        default_atmosphere_id: moment.atmosphereId,
        selection_score: moment.selectionScore,
        selection_reason: moment.selectionReason,
        reviewed_at: null,
      })
      .select('id')
      .single()

    if (queueErr || !queue) throw queueErr || new Error('Failed to create promote queue row')
    queueIds.push(queue.id as string)

    const targetRows = platforms.map((platform) => ({
      queue_id: queue.id,
      platform,
      connection_id: connection?.id ?? null,
      status: connection?.status === 'connected' ? 'pending' : 'skipped',
      error_message: connection?.status === 'connected'
        ? null
        : 'Connect YouTube in Settings before publishing.',
    }))

    const { error: targetErr } = await admin.from('promote_queue_targets').insert(targetRows)
    if (targetErr) throw targetErr
  }

  return { queueIds }
}
