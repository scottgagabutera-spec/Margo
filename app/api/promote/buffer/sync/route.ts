import { NextResponse } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { syncArtistBufferChannels } from '@/lib/promote/buffer/connections'
import { bufferServiceToPlatform } from '@/lib/promote/buffer/service-map'

export async function POST() {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getPromoteAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  try {
    const { organizationId, channels } = await syncArtistBufferChannels(admin, session.userId)
    return NextResponse.json({
      ok: true,
      organizationId,
      channels: channels.map((ch) => ({
        id: ch.id,
        service: ch.service,
        name: ch.name,
        displayName: ch.displayName ?? null,
        platform: bufferServiceToPlatform(ch.service),
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Buffer channel sync failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
