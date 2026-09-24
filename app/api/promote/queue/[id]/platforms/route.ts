import { NextResponse } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { fetchArtistSocialConnections } from '@/lib/promote/build-queue-targets'
import {
  computeQueueItemPlatformRows,
  pruneSelectedPlatforms,
  selectedPlatformsFromTargets,
} from '@/lib/promote/queue-item-platforms'
import { fetchPublishedPlatformsForPost, latestPublishByPlatform } from '@/lib/promote/publish-history'
import { resolveQueueVisualPrefs, type PromotePlatform, type PromoteTargetStatus } from '@/lib/promote/types'
import type { MomentShapeId } from '@/lib/moment/types'

const EDITABLE_STATUSES = ['pending_review', 'approved'] as const

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: queueId } = await context.params
  const { searchParams } = new URL(request.url)
  const shapeParam = searchParams.get('shapeId')

  const admin = getPromoteAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const { data: queue, error: queueErr } = await admin
    .from('promote_queue')
    .select('id, profile_id, status, source_post_id, default_shape_id, override_shape_id')
    .eq('id', queueId)
    .eq('profile_id', session.userId)
    .maybeSingle()

  if (queueErr || !queue) {
    return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })
  }

  const savedShape = resolveQueueVisualPrefs({
    defaultShapeId: queue.default_shape_id as MomentShapeId,
    defaultThemeId: 'gold',
    defaultAtmosphereId: 'still',
    overrideShapeId: (queue.override_shape_id as MomentShapeId | null) ?? null,
    overrideThemeId: null,
    overrideAtmosphereId: null,
  }).exportShapeId
  const shapeId = (shapeParam && ['square', 'vertical', 'wide'].includes(shapeParam)
    ? shapeParam
    : savedShape) as MomentShapeId

  const { data: targets, error: targetsErr } = await admin
    .from('promote_queue_targets')
    .select('platform, status, published_at, external_post_url')
    .eq('queue_id', queueId)

  if (targetsErr) return NextResponse.json({ error: targetsErr.message }, { status: 500 })

  const [connections, publishRecords] = await Promise.all([
    fetchArtistSocialConnections(admin, session.userId),
    queue.source_post_id
      ? fetchPublishedPlatformsForPost(admin, session.userId, queue.source_post_id as string)
      : Promise.resolve([]),
  ])

  const publishedByPlatform = latestPublishByPlatform(
    publishRecords.filter((record) => record.queueId !== queueId),
  )

  const savedSelected = selectedPlatformsFromTargets((targets || []) as Array<{
    platform: PromotePlatform
    status: PromoteTargetStatus
  }>)

  const selectedPlatforms = shapeParam && shapeParam !== savedShape
    ? pruneSelectedPlatforms(shapeId, connections, savedSelected)
    : savedSelected

  const platforms = computeQueueItemPlatformRows(
    shapeId,
    connections,
    (targets || []) as Array<{
      platform: PromotePlatform
      status: PromoteTargetStatus
      published_at?: string | null
      external_post_url?: string | null
    }>,
    publishedByPlatform,
    selectedPlatforms,
  )

  return NextResponse.json({
    shapeId,
    savedShapeId: savedShape,
    editable: (EDITABLE_STATUSES as readonly string[]).includes(queue.status as string),
    platforms,
    selectedPlatforms,
  })
}
