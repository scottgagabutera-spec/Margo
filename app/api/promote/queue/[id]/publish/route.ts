import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { cleanupPromoteStagingVideoIfComplete } from '@/lib/promote/cleanup-staging'
import {
  copyPromoteStagingToFinal,
  deletePromoteVideo,
  getPromoteVideoBytesFromR2,
  promoteStagingObjectKey,
  uploadPromoteVideo,
} from '@/lib/promote/r2-promote-upload'
import { isPromotePlatformLive } from '@/lib/promote/platforms'
import { publishVideoToPlatform } from '@/lib/promote/publish-to-platform'
import { resolveQueueStatusFromTargets } from '@/lib/promote/resolve-queue-status'
import { resolveQueueVisualPrefs, type PromotePlatform } from '@/lib/promote/types'

export const runtime = 'nodejs'
export const maxDuration = 60

async function readPublishVideoBuffer(
  request: Request,
  _admin: SupabaseClient,
  userId: string,
  queueId: string,
): Promise<{ buffer: Buffer; stagingKey: string } | { error: string; status: number }> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    let body: { stagingKey?: unknown; storagePath?: unknown }
    try {
      body = await request.json()
    } catch {
      return { error: 'Invalid JSON body — expected { stagingKey }', status: 400 }
    }
    const stagingKey =
      (typeof body.stagingKey === 'string' ? body.stagingKey.trim() : '')
      || (typeof body.storagePath === 'string' ? body.storagePath.trim() : '')
    const expected = promoteStagingObjectKey(userId, queueId)
    if (!stagingKey || stagingKey !== expected) {
      return {
        error: `stagingKey must be exactly ${expected}`,
        status: 400,
      }
    }
    try {
      const buffer = await getPromoteVideoBytesFromR2(stagingKey)
      return { buffer, stagingKey }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not read staged video'
      return { error: msg, status: 400 }
    }
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
    return { error: 'video file is required (or JSON { stagingKey } from presigned PUT flow)', status: 400 }
  }
  const buffer = Buffer.from(await video.arrayBuffer())
  if (buffer.length === 0) {
    return { error: 'Uploaded video is empty (0 bytes)', status: 400 }
  }
  return { buffer, stagingKey: '' }
}

type TargetRow = {
  id: string
  platform: PromotePlatform
  status: string
  connection_id: string | null
  external_post_id: string | null
  external_post_url: string | null
}

function publishedTargetResponse(target: TargetRow) {
  return {
    ok: true as const,
    videoId: target.external_post_id,
    videoUrl: target.external_post_url,
    alreadyPublished: true,
  }
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
  const stagingKeyForCleanup = videoResult.stagingKey

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

  const allTargets = (targets || []) as TargetRow[]
  const publishableTargets = allTargets.filter(
    (t) => isPromotePlatformLive(t.platform) && t.status !== 'skipped',
  )

  if (publishableTargets.length === 0) {
    await admin.from('promote_queue').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', queueId)
    return NextResponse.json(
      { error: 'No connected platforms — connect your accounts in Settings before publishing.' },
      { status: 400 },
    )
  }

  const alreadyPublished = publishableTargets.filter(
    (t) => t.status === 'published' && t.external_post_id && t.external_post_url,
  )
  if (alreadyPublished.length === publishableTargets.length) {
    const primary = alreadyPublished[0]
    return NextResponse.json(publishedTargetResponse(primary))
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
    const { data: refreshedTargets } = await admin
      .from('promote_queue_targets')
      .select('external_post_id, external_post_url, status, platform')
      .eq('queue_id', queueId)
    const done = (refreshedTargets || []).filter(
      (t) => t.status === 'published' && t.external_post_id && t.external_post_url,
    )
    if (done.length > 0) {
      return NextResponse.json(publishedTargetResponse(done[0] as TargetRow))
    }
    return NextResponse.json(
      { error: 'This moment is already being published. Please wait.' },
      { status: 409 },
    )
  }

  let objectKey: string
  let videoPublicUrl: string
  try {
    if (stagingKeyForCleanup) {
      const copied = await copyPromoteStagingToFinal(stagingKeyForCleanup, session.userId, queueId)
      objectKey = copied.objectKey
      videoPublicUrl = copied.publicUrl
      try {
        await deletePromoteVideo(stagingKeyForCleanup)
      } catch (e) {
        console.error('[promote/publish] could not delete R2 staging object (orphan cleanup via cron)', e)
      }
    } else {
      const uploaded = await uploadPromoteVideo(session.userId, queueId, videoBuffer)
      objectKey = uploaded.objectKey
      videoPublicUrl = uploaded.publicUrl
    }
    await admin
      .from('promote_queue')
      .update({
        rendered_video_url: videoPublicUrl,
        rendered_at: new Date().toISOString(),
      })
      .eq('id', queueId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to store rendered video'
    console.error('[promote/publish] R2 upload failed', err)
    await admin.from('promote_queue').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', queueId)
    return NextResponse.json({ error: `Failed to store rendered video: ${message}` }, { status: 500 })
  }

  const prefs = resolveQueueVisualPrefs({
    defaultShapeId: queue.default_shape_id,
    defaultThemeId: queue.default_theme_id,
    defaultAtmosphereId: queue.default_atmosphere_id,
    overrideShapeId: queue.override_shape_id,
    overrideThemeId: queue.override_theme_id,
    overrideAtmosphereId: queue.override_atmosphere_id,
  })

  const { data: publisher } = await admin
    .from('profiles')
    .select('username')
    .eq('id', session.userId)
    .maybeSingle()

  const publishResults: Array<{
    platform: PromotePlatform
    videoId: string
    videoUrl: string
    status: 'published' | 'failed'
    error?: string
  }> = []

  for (const target of publishableTargets) {
    if (target.status === 'published' && target.external_post_id && target.external_post_url) {
      publishResults.push({
        platform: target.platform,
        videoId: target.external_post_id,
        videoUrl: target.external_post_url,
        status: 'published',
      })
      continue
    }

    const { data: connection, error: connErr } = await admin
      .from('artist_social_connections')
      .select('*')
      .eq('profile_id', session.userId)
      .eq('platform', target.platform)
      .maybeSingle()

    if (connErr || !connection) {
      const message = `Connect ${target.platform} in Settings before publishing.`
      await admin
        .from('promote_queue_targets')
        .update({ status: 'failed', error_message: message })
        .eq('id', target.id)
      publishResults.push({
        platform: target.platform,
        videoId: '',
        videoUrl: '',
        status: 'failed',
        error: message,
      })
      continue
    }

    await admin
      .from('promote_queue_targets')
      .update({ status: 'publishing' })
      .eq('id', target.id)

    try {
      const result = await publishVideoToPlatform(
        admin,
        target.platform,
        connection,
        videoBuffer,
        {
          songTitle: queue.song_title,
          lyricText: queue.lyric_text,
          artistName: queue.artist_name,
          publisherUsername: publisher?.username,
          privacyStatus: 'public',
          videoPublicUrl,
        },
      )

      await admin
        .from('promote_queue_targets')
        .update({
          status: 'published',
          external_post_id: result.postId,
          external_post_url: result.postUrl,
          published_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', target.id)

      await admin
        .from('artist_social_connections')
        .update({ last_publish_at: new Date().toISOString(), last_error: null })
        .eq('id', connection.id)

      publishResults.push({
        platform: target.platform,
        videoId: result.postId,
        videoUrl: result.postUrl,
        status: 'published',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : `${target.platform} publish failed`
      console.error(`[promote/publish] ${target.platform} failed`, err)
      await admin
        .from('promote_queue_targets')
        .update({ status: 'failed', error_message: message })
        .eq('id', target.id)
      publishResults.push({
        platform: target.platform,
        videoId: '',
        videoUrl: '',
        status: 'failed',
        error: message,
      })
    }
  }

  const { data: finalTargets } = await admin
    .from('promote_queue_targets')
    .select('status')
    .eq('queue_id', queueId)

  const finalStatus = resolveQueueStatusFromTargets(finalTargets || [])
  await admin
    .from('promote_queue')
    .update({
      status: finalStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', queueId)

  const cleanupOutcome = await cleanupPromoteStagingVideoIfComplete(
    admin,
    queueId,
    session.userId,
    objectKey,
  )
  if (cleanupOutcome.status === 'failed') {
    console.error('[promote/publish] staging cleanup failed after publish', {
      queueId,
      objectKey,
      reason: cleanupOutcome.reason,
      error: cleanupOutcome.error,
    })
  }

  const successes = publishResults.filter((r) => r.status === 'published')
  if (successes.length === 0) {
    const firstError = publishResults.find((r) => r.error)?.error || 'Publish failed on all platforms'
    return NextResponse.json({ error: firstError }, { status: 502 })
  }

  const primary = successes[0]
  return NextResponse.json({
    ok: true,
    videoId: primary.videoId,
    videoUrl: primary.videoUrl,
    shapeId: prefs.exportShapeId,
    objectKey,
    publicVideoUrl: videoPublicUrl,
    results: publishResults,
    queueStatus: finalStatus,
  })
}
