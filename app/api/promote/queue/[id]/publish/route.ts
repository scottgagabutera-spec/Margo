import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { cleanupPromoteStagingVideoIfComplete } from '@/lib/promote/cleanup-staging'
import { getValidYouTubeAccessToken } from '@/lib/promote/connections'
import { signedPromoteVideoUrl, uploadPromoteVideo } from '@/lib/promote/r2-promote-upload'
import { resolveQueueVisualPrefs } from '@/lib/promote/types'
import { uploadVideoToYouTube } from '@/lib/promote/youtube-publish'

export const runtime = 'nodejs'
export const maxDuration = 60

const STAGING_BUCKET = 'song-audio'

function expectedStagingPath(userId: string, queueId: string): string {
  return `${userId}/promote/${queueId}.mp4`
}

async function readPublishVideoBuffer(
  request: Request,
  admin: SupabaseClient,
  userId: string,
  queueId: string,
): Promise<{ buffer: Buffer } | { error: string; status: number }> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    let body: { storagePath?: unknown }
    try {
      body = await request.json()
    } catch {
      return { error: 'Invalid JSON body — expected { storagePath }', status: 400 }
    }
    const storagePath = typeof body.storagePath === 'string' ? body.storagePath.trim() : ''
    const expected = expectedStagingPath(userId, queueId)
    if (storagePath !== expected) {
      return {
        error: `storagePath must be exactly ${expected}`,
        status: 400,
      }
    }
    const { data, error } = await admin.storage.from(STAGING_BUCKET).download(storagePath)
    if (error || !data) {
      return {
        error: `Could not read staged video from storage: ${error?.message || 'not found'}`,
        status: 400,
      }
    }
    const buffer = Buffer.from(await data.arrayBuffer())
    if (buffer.length === 0) {
      return { error: 'Staged video is empty (0 bytes)', status: 400 }
    }
    const { error: removeErr } = await admin.storage.from(STAGING_BUCKET).remove([storagePath])
    if (removeErr) {
      console.error('[promote/publish] staging cleanup failed', removeErr)
    }
    return { buffer }
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch (err) {
    return {
      error: `Could not read upload body: ${err instanceof Error ? err.message : 'parse failed'}`,
      status: 400,
    }
  }
  const video = form.get('video')
  if (!(video instanceof Blob)) {
    return { error: 'video file is required (or JSON { storagePath })', status: 400 }
  }
  const buffer = Buffer.from(await video.arrayBuffer())
  if (buffer.length === 0) {
    return { error: 'Uploaded video is empty (0 bytes)', status: 400 }
  }
  return { buffer }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: queueId } = await context.params
  const admin = getPromoteAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const videoResult = await readPublishVideoBuffer(request, admin, session.userId, queueId)
  if ('error' in videoResult) {
    return NextResponse.json({ error: videoResult.error }, { status: videoResult.status })
  }
  const videoBuffer = videoResult.buffer

  const { data: queue, error: queueErr } = await admin
    .from('promote_queue')
    .select('*')
    .eq('id', queueId)
    .eq('profile_id', session.userId)
    .in('status', ['approved', 'publishing', 'partial', 'published'])
    .maybeSingle()

  if (queueErr || !queue) {
    return NextResponse.json({ error: 'Queue item not found or not ready to publish' }, { status: 404 })
  }

  const { data: targets } = await admin
    .from('promote_queue_targets')
    .select('*')
    .eq('queue_id', queueId)

  const youtubeTarget = (targets || []).find((t) => t.platform === 'youtube')
  if (!youtubeTarget || youtubeTarget.status === 'skipped') {
    await admin.from('promote_queue').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', queueId)
    return NextResponse.json({ error: 'YouTube target not available — connect YouTube in Settings.' }, { status: 400 })
  }

  if (
    youtubeTarget.status === 'published'
    && youtubeTarget.external_post_id
    && youtubeTarget.external_post_url
  ) {
    return NextResponse.json({
      ok: true,
      videoId: youtubeTarget.external_post_id,
      videoUrl: youtubeTarget.external_post_url,
      alreadyPublished: true,
    })
  }

  const { data: claimed, error: claimErr } = await admin
    .from('promote_queue')
    .update({ status: 'publishing', updated_at: new Date().toISOString() })
    .eq('id', queueId)
    .eq('profile_id', session.userId)
    .in('status', ['approved', 'partial'])
    .select('id')
    .maybeSingle()

  if (claimErr) {
    return NextResponse.json({ error: claimErr.message }, { status: 500 })
  }
  if (!claimed) {
    const { data: refreshedTarget } = await admin
      .from('promote_queue_targets')
      .select('external_post_id, external_post_url, status')
      .eq('id', youtubeTarget.id)
      .maybeSingle()
    if (
      refreshedTarget?.status === 'published'
      && refreshedTarget.external_post_id
      && refreshedTarget.external_post_url
    ) {
      return NextResponse.json({
        ok: true,
        videoId: refreshedTarget.external_post_id,
        videoUrl: refreshedTarget.external_post_url,
        alreadyPublished: true,
      })
    }
    return NextResponse.json(
      { error: 'This moment is already being published. Please wait.' },
      { status: 409 },
    )
  }

  let objectKey: string
  try {
    const uploaded = await uploadPromoteVideo(session.userId, queueId, videoBuffer)
    objectKey = uploaded.objectKey
    const signedUrl = await signedPromoteVideoUrl(objectKey)
    await admin
      .from('promote_queue')
      .update({
        rendered_video_url: signedUrl,
        rendered_at: new Date().toISOString(),
      })
      .eq('id', queueId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to store rendered video'
    console.error('[promote/publish] R2 upload failed', err)
    await admin.from('promote_queue').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', queueId)
    return NextResponse.json({ error: `Failed to store rendered video: ${message}` }, { status: 500 })
  }

  const { data: connection, error: connErr } = await admin
    .from('artist_social_connections')
    .select('*')
    .eq('profile_id', session.userId)
    .eq('platform', 'youtube')
    .maybeSingle()

  if (connErr || !connection) {
    await admin
      .from('promote_queue_targets')
      .update({
        status: 'failed',
        error_message: 'YouTube not connected',
      })
      .eq('id', youtubeTarget.id)
    await admin.from('promote_queue').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', queueId)
    await cleanupPromoteStagingVideoIfComplete(admin, queueId, objectKey)
    return NextResponse.json({ error: 'YouTube not connected' }, { status: 400 })
  }

  await admin
    .from('promote_queue_targets')
    .update({ status: 'publishing' })
    .eq('id', youtubeTarget.id)

  try {
    const accessToken = await getValidYouTubeAccessToken(admin, connection)
    const prefs = resolveQueueVisualPrefs({
      defaultShapeId: queue.default_shape_id,
      defaultThemeId: queue.default_theme_id,
      defaultAtmosphereId: queue.default_atmosphere_id,
      overrideShapeId: queue.override_shape_id,
      overrideThemeId: queue.override_theme_id,
      overrideAtmosphereId: queue.override_atmosphere_id,
    })

    const title = `${queue.song_title} — ${String(queue.lyric_text).split('\n')[0]}`.slice(0, 100)
    const description = [
      String(queue.lyric_text).trim(),
      '',
      `${queue.song_title} · ${queue.artist_name}`,
      '',
      'Shared via MARGO',
    ].join('\n')

    const result = await uploadVideoToYouTube({
      accessToken,
      videoBytes: videoBuffer,
      title,
      description,
      privacyStatus: 'public',
    })

    await admin
      .from('promote_queue_targets')
      .update({
        status: 'published',
        external_post_id: result.videoId,
        external_post_url: result.videoUrl,
        published_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', youtubeTarget.id)

    await admin
      .from('artist_social_connections')
      .update({ last_publish_at: new Date().toISOString(), last_error: null })
      .eq('id', connection.id)

    await admin
      .from('promote_queue')
      .update({
        status: 'published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId)

    await cleanupPromoteStagingVideoIfComplete(admin, queueId, objectKey)

    return NextResponse.json({
      ok: true,
      videoId: result.videoId,
      videoUrl: result.videoUrl,
      shapeId: prefs.exportShapeId,
      objectKey,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'YouTube publish failed'
    console.error('[promote/publish] YouTube failed', err)
    await admin
      .from('promote_queue_targets')
      .update({ status: 'failed', error_message: message })
      .eq('id', youtubeTarget.id)
    await admin
      .from('artist_social_connections')
      .update({ last_error: message })
      .eq('id', connection.id)
    await admin.from('promote_queue').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', queueId)
    await cleanupPromoteStagingVideoIfComplete(admin, queueId, objectKey)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
