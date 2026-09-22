import { NextResponse } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { fetchArtistBufferConnection } from '@/lib/promote/buffer/connections'
import { bufferServiceToPlatform } from '@/lib/promote/buffer/service-map'
import type { BufferConnectionPublic } from '@/lib/promote/types'

function mapBufferPublic(row: NonNullable<Awaited<ReturnType<typeof fetchArtistBufferConnection>>>): BufferConnectionPublic {
  const channels = (row.channels ?? []).map((ch) => ({
    id: ch.id,
    service: ch.service,
    name: ch.name,
    displayName: ch.displayName ?? null,
    platform: bufferServiceToPlatform(ch.service),
  }))

  return {
    status: row.status as BufferConnectionPublic['status'],
    organizationId: row.organization_id,
    channels,
    channelsSyncedAt: row.channels_synced_at,
    connectedAt: row.connected_at,
    lastError: row.last_error,
  }
}

export async function GET() {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getPromoteAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const connection = await fetchArtistBufferConnection(admin, session.userId)
  if (!connection) {
    return NextResponse.json({ connected: false, connection: null })
  }

  return NextResponse.json({
    connected: connection.status === 'connected',
    connection: mapBufferPublic(connection),
  })
}

export async function DELETE() {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getPromoteAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  await admin
    .from('artist_buffer_connections')
    .delete()
    .eq('profile_id', session.userId)

  await admin
    .from('artist_social_connections')
    .delete()
    .eq('profile_id', session.userId)
    .eq('publish_adapter', 'buffer')

  return NextResponse.json({ ok: true })
}
