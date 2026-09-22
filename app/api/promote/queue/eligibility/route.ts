import { NextResponse } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { bufferServiceToPlatform } from '@/lib/promote/buffer/service-map'
import {
  platformSupportsShape,
  shapeRequirementHint,
} from '@/lib/promote/platforms'
import { fetchPublishedPlatformsForPost, latestPublishByPlatform } from '@/lib/promote/publish-history'
import {
  isPlatformPublishReady,
  loadArtistPublishContext,
} from '@/lib/promote/publish-readiness'
import type { MomentShapeId } from '@/lib/moment/types'
import { PROMOTE_PLATFORM_DEFS } from '@/lib/promote/types'

export async function GET(request: Request) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const postId = searchParams.get('postId')?.trim()
  const shapeId = searchParams.get('shapeId') as MomentShapeId | null

  if (!postId) {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 })
  }
  if (!shapeId || !['square', 'vertical', 'wide'].includes(shapeId)) {
    return NextResponse.json({ error: 'shapeId must be square, vertical, or wide' }, { status: 400 })
  }

  const admin = getPromoteAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const [publishContext, publishRecords] = await Promise.all([
    loadArtistPublishContext(admin, session.userId),
    fetchPublishedPlatformsForPost(admin, session.userId, postId),
  ])

  const { connections, bufferConnection } = publishContext
  const publishedByPlatform = latestPublishByPlatform(publishRecords)
  const connectionByPlatform = new Map(connections.map((c) => [c.platform, c]))

  const bufferChannelPlatforms = new Set(
    (bufferConnection?.channels ?? [])
      .map((ch) => bufferServiceToPlatform(ch.service))
      .filter(Boolean),
  )

  const platforms = PROMOTE_PLATFORM_DEFS.map((def) => {
    const connection = connectionByPlatform.get(def.id)
    const published = publishedByPlatform.get(def.id)
    const supportsShape = platformSupportsShape(def.id, shapeId)
    const publishReady = isPlatformPublishReady(def.id, connections, bufferConnection, shapeId)
    const viaBuffer = connection?.publish_adapter === 'buffer'
      || (bufferChannelPlatforms.has(def.id) && !def.live)

    let state: 'selectable' | 'wrong_shape' | 'not_connected' | 'coming_soon' | 'already_published'
    if (!supportsShape) state = 'wrong_shape'
    else if (!publishReady && !def.live && !viaBuffer) state = 'coming_soon'
    else if (!publishReady) state = 'not_connected'
    else if (published) state = 'already_published'
    else state = 'selectable'

    return {
      id: def.id,
      label: def.label,
      live: def.live || viaBuffer,
      publishAdapter: viaBuffer ? 'buffer' as const : (connection?.publish_adapter === 'buffer' ? 'buffer' as const : 'direct' as const),
      state,
      shapeHint: shapeRequirementHint(def.id, shapeId),
      connected: publishReady,
      publishedAt: published?.publishedAt ?? null,
      externalPostUrl: published?.externalPostUrl ?? null,
    }
  })

  const defaultSelected = platforms
    .filter((p) => p.state === 'selectable')
    .map((p) => p.id)

  return NextResponse.json({
    shapeId,
    platforms,
    defaultSelected,
    bufferConnected: bufferConnection?.status === 'connected',
  })
}
