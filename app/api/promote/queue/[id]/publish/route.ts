import { NextResponse } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { getValidYouTubeAccessToken } from '@/lib/promote/connections'
import { cleanupPromoteStagingVideoIfComplete } from '@/lib/promote/cleanup-staging'
import { signedPromoteVideoUrl, uploadPromoteVideo } from '@/lib/promote/r2-promote-upload'
import { resolveQueueVisualPrefs } from '@/lib/promote/types'
import { uploadVideoToYouTube } from '@/lib/promote/youtube-publish'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: queueId } = await context.params
  const admin = getPromoteAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const form = await request.formData()
  const video = form.get('video')
  if (!(video instanceof Blob)) {
    return NextResponse.json({ error: 'video file is required' }, { status: 400 })
  }

  const videoBuffer = Buffer.from(await video.arrayBuffer())

  const { data: queue, error: queueErr } = await admin
    .from('promote_queue')
    .select('*')
    .eq('id', queueId)
    .eq('profile_id', session.userId)
    .in('status', ['approved', 'publishing', 'partial'])
    .maybeSingle()

  if (queueErr || !queue) {
    return NextResponse.json({ error: 'Queue item not found or not ready to publish' }, { status: 404 })
  }

  await admin
    .from('promote_queue')
    .update({ status: 'publishing', updated_at: new Date().toISOString() })
    .eq('id', queueId)

  const { data: targets } = await admin
    .from('promote_queue_targets')
    .select('*')
    .eq('queue_id', queueId)

  const youtubeTarget = (targets || []).find((t) => t.platform === 'youtube')
  if (!youtubeTarget || youtubeTarget.status === 'skipped') {
    await admin.from('promote_queue').update({ status: 'failed' }).eq('id', queueId)
    return NextResponse.json({ error: 'YouTube target not available — connect YouTube in Settings.' }, { status: 400 })
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
    console.error('[promote/publish] R2 upload failed', err)
    await admin.from('promote_queue').update({ status: 'failed' }).eq('id', queueId)
    return NextResponse.json({ error: 'Failed to store rendered video' }, { status: 500 })
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
    await admin.from('promote_queue').update({ status: 'failed' }).eq('id', queueId)
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
    await admin.from('promote_queue').update({ status: 'failed' }).eq('id', queueId)
    await cleanupPromoteStagingVideoIfComplete(admin, queueId, objectKey)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
