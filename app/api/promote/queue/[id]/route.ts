import { NextResponse } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { fetchArtistSocialConnections } from '@/lib/promote/build-queue-targets'
import { pruneSelectedPlatforms, selectedPlatformsFromTargets } from '@/lib/promote/queue-item-platforms'
import { syncPromoteQueueTargets } from '@/lib/promote/sync-queue-targets'
import { validateSelectedPlatforms } from '@/lib/promote/platforms'
import { resolveQueueVisualPrefs, type PromotePlatform, type PromoteTargetStatus } from '@/lib/promote/types'
import type { MomentShapeId } from '@/lib/moment/types'

const EDITABLE_STATUSES = ['pending_review', 'approved'] as const
const VALID_PLATFORMS = new Set<PromotePlatform>(['youtube', 'tiktok', 'instagram', 'facebook', 'x'])

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await context.params
  let body: {
    overrideThemeId?: string | null
    overrideAtmosphereId?: string | null
    overrideShapeId?: string | null
    selectedPlatforms?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const admin = getPromoteAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const { data: queue, error: queueErr } = await admin
    .from('promote_queue')
    .select('id, default_shape_id, override_shape_id')
    .eq('id', id)
    .eq('profile_id', session.userId)
    .in('status', [...EDITABLE_STATUSES])
    .maybeSingle()

  if (queueErr) return NextResponse.json({ error: queueErr.message }, { status: 500 })
  if (!queue) return NextResponse.json({ error: 'Queue item not found or not editable' }, { status: 404 })

  const savedShape = resolveQueueVisualPrefs({
    defaultShapeId: queue.default_shape_id as MomentShapeId,
    defaultThemeId: 'gold',
    defaultAtmosphereId: 'still',
    overrideShapeId: (queue.override_shape_id as MomentShapeId | null) ?? null,
    overrideThemeId: null,
    overrideAtmosphereId: null,
  }).exportShapeId

  const nextShape = (body.overrideShapeId !== undefined
    ? body.overrideShapeId
    : savedShape) as MomentShapeId

  if (body.overrideShapeId !== undefined && body.overrideShapeId !== null) {
    if (!['square', 'vertical', 'wide'].includes(body.overrideShapeId)) {
      return NextResponse.json({ error: 'Invalid overrideShapeId' }, { status: 400 })
    }
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.overrideThemeId !== undefined) patch.override_theme_id = body.overrideThemeId
  if (body.overrideAtmosphereId !== undefined) patch.override_atmosphere_id = body.overrideAtmosphereId
  if (body.overrideShapeId !== undefined) patch.override_shape_id = body.overrideShapeId

  if (body.selectedPlatforms !== undefined) {
    if (!Array.isArray(body.selectedPlatforms)) {
      return NextResponse.json({ error: 'selectedPlatforms must be an array' }, { status: 400 })
    }
    const selectedPlatforms = body.selectedPlatforms.filter(
      (platform): platform is PromotePlatform => typeof platform === 'string' && VALID_PLATFORMS.has(platform as PromotePlatform),
    )
    if (selectedPlatforms.length === 0) {
      return NextResponse.json({ error: 'Select at least one platform.' }, { status: 400 })
    }
    const validation = validateSelectedPlatforms(nextShape, selectedPlatforms)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const connections = await fetchArtistSocialConnections(admin, session.userId)
    const pruned = pruneSelectedPlatforms(nextShape, connections, selectedPlatforms)
    if (pruned.length === 0) {
      return NextResponse.json({ error: 'No connected platforms match this size.' }, { status: 400 })
    }
    await syncPromoteQueueTargets(admin, session.userId, id, nextShape, pruned)
  } else if (body.overrideShapeId !== undefined) {
    const { data: targets } = await admin
      .from('promote_queue_targets')
      .select('platform, status')
      .eq('queue_id', id)
    const savedSelected = selectedPlatformsFromTargets((targets || []) as Array<{
      platform: PromotePlatform
      status: PromoteTargetStatus
    }>)
    const connections = await fetchArtistSocialConnections(admin, session.userId)
    const pruned = pruneSelectedPlatforms(nextShape, connections, savedSelected)
    await syncPromoteQueueTargets(admin, session.userId, id, nextShape, pruned)
  }

  const { data, error } = await admin
    .from('promote_queue')
    .update(patch)
    .eq('id', id)
    .eq('profile_id', session.userId)
    .in('status', [...EDITABLE_STATUSES])
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Queue item not found or not editable' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
