import { NextResponse } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { fetchArtistSocialConnections } from '@/lib/promote/build-queue-targets'
import {
  platformSupportsShape,
  PROMOTE_PLATFORM_DEFS,
  shapeRequirementHint,
} from '@/lib/promote/platforms'
import { fetchPublishedPlatformsForPost, latestPublishByPlatform } from '@/lib/promote/publish-history'
import type { MomentShapeId } from '@/lib/moment/types'

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

  const [connections, publishRecords] = await Promise.all([
    fetchArtistSocialConnections(admin, session.userId),
    fetchPublishedPlatformsForPost(admin, session.userId, postId),
  ])

  const publishedByPlatform = latestPublishByPlatform(publishRecords)
  const connectionByPlatform = new Map(connections.map((c) => [c.platform, c]))

  const platforms = PROMOTE_PLATFORM_DEFS.map((def) => {
    const connection = connectionByPlatform.get(def.id)
    const published = publishedByPlatform.get(def.id)
    const supportsShape = platformSupportsShape(def.id, shapeId)
    const connected = connection?.status === 'connected'

    let state: 'selectable' | 'wrong_shape' | 'not_connected' | 'coming_soon' | 'already_published'
    if (!def.live) state = 'coming_soon'
    else if (!supportsShape) state = 'wrong_shape'
    else if (!connected) state = 'not_connected'
    else if (published) state = 'already_published'
    else state = 'selectable'

    return {
      id: def.id,
      label: def.label,
      live: def.live,
      state,
      shapeHint: shapeRequirementHint(def.id, shapeId),
      connected,
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
  })
}
