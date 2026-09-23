import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildPromoteQueueTargetRows,
  fetchArtistSocialConnections,
} from '@/lib/promote/build-queue-targets'
import { exportPrefsFromPostRow } from '@/lib/promote/export-prefs'
import { validateSelectedPlatforms } from '@/lib/promote/platforms'
import {
  fetchPublishedPlatformsForPost,
  latestPublishByPlatform,
} from '@/lib/promote/publish-history'
import type { PromotePlatform, PromotePublishMode } from '@/lib/promote/types'

type MomentPostRow = {
  id: string
  text: string | null
  song_title: string | null
  artist_name: string | null
  artwork_url: string | null
  snippet_start_sec: number | null
  snippet_end_sec: number | null
  song_id: string | null
  export_shape_id: string | null
  export_theme_id: string | null
  export_atmosphere_id: string | null
  songs?: { atmosphere?: string | null } | Array<{ atmosphere?: string | null }> | null
}

export interface CreatePromoteQueueInput {
  profileId: string
  postId: string
  publishMode: PromotePublishMode
  platforms: PromotePlatform[]
  confirmRepublish?: boolean
}

export async function createPromoteQueueFromMoment(
  admin: SupabaseClient,
  input: CreatePromoteQueueInput,
): Promise<{ queueId: string; initialStatus: string }> {
  const { profileId, postId, publishMode, platforms, confirmRepublish = false } = input

  const { data: post, error: postErr } = await admin
    .from('posts')
    .select(`
      id, text, song_title, artist_name, artwork_url,
      snippet_start_sec, snippet_end_sec, song_id,
      export_shape_id, export_theme_id, export_atmosphere_id,
      songs:song_id ( atmosphere )
    `)
    .eq('id', postId)
    .eq('author_profile_id', profileId)
    .is('parent_post_id', null)
    .maybeSingle()

  if (postErr || !post) {
    throw new Error('Moment not found or not owned by you')
  }

  const prefs = exportPrefsFromPostRow(post as MomentPostRow)
  const validation = validateSelectedPlatforms(prefs.exportShapeId, platforms)
  if (!validation.ok) throw new Error(validation.error)

  const publishRecords = await fetchPublishedPlatformsForPost(admin, profileId, postId)
  const publishedByPlatform = latestPublishByPlatform(publishRecords)
  const republishPlatforms = platforms.filter((p) => publishedByPlatform.has(p))
  if (republishPlatforms.length > 0 && !confirmRepublish) {
    const err = new Error('This Moment was already promoted to some selected platforms.') as Error & {
      code: 'REPUBLISH_CONFIRM_REQUIRED'
      republishPlatforms: PromotePlatform[]
    }
    err.code = 'REPUBLISH_CONFIRM_REQUIRED'
    err.republishPlatforms = republishPlatforms
    throw err
  }

  const initialStatus = publishMode === 'auto' ? 'approved' : 'pending_review'

  const { data: queue, error: queueErr } = await admin
    .from('promote_queue')
    .insert({
      profile_id: profileId,
      status: initialStatus,
      source_type: 'existing_moment',
      source_post_id: postId,
      source_song_id: (post as MomentPostRow).song_id,
      lyric_text: (post.text || '').trim(),
      snippet_start_sec: post.snippet_start_sec,
      snippet_end_sec: post.snippet_end_sec,
      song_title: post.song_title || '',
      artist_name: post.artist_name || '',
      artwork_url: post.artwork_url,
      default_shape_id: prefs.exportShapeId,
      default_theme_id: prefs.exportThemeId,
      default_atmosphere_id: prefs.exportAtmosphereId,
      reviewed_at: publishMode === 'auto' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (queueErr || !queue) throw queueErr || new Error('Failed to create promote queue row')

  const connections = await fetchArtistSocialConnections(admin, profileId)
  const targetRows = buildPromoteQueueTargetRows(queue.id as string, platforms, connections)
  if (targetRows.length === 0) {
    throw new Error('No valid platforms selected — connect an account in Settings first.')
  }

  const { error: targetErr } = await admin.from('promote_queue_targets').insert(targetRows)
  if (targetErr) throw targetErr

  return { queueId: queue.id as string, initialStatus }
}
