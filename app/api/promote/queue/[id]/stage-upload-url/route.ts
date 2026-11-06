import { NextResponse } from 'next/server'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { presignedPutPromoteStagingVideo } from '@/lib/promote/r2-promote-upload'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Returns a short-lived presigned PUT URL for staging a rendered promote MP4 on R2.
 * Video bytes never pass through Vercel.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requirePromoteSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = getPromoteAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const { id: queueId } = await context.params
  if (!queueId?.trim()) {
    return NextResponse.json({ error: 'Invalid queue id' }, { status: 400 })
  }

  const { data: queue, error: queueErr } = await admin
    .from('promote_queue')
    .select('id, profile_id, status')
    .eq('id', queueId)
    .eq('profile_id', session.userId)
    .in('status', ['approved', 'publishing', 'partial', 'published'])
    .maybeSingle()

  if (queueErr || !queue) {
    return NextResponse.json(
      { error: 'Queue item not found or not ready to stage' },
      { status: 404 },
    )
  }

  try {
    const presigned = await presignedPutPromoteStagingVideo(session.userId, queueId)
    return NextResponse.json({
      url: presigned.url,
      headers: presigned.headers,
      key: presigned.key,
      expiresAt: presigned.expiresAt,
      expiresInSec: presigned.expiresInSec,
      maxBytes: presigned.maxBytes,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create upload URL'
    console.error('[promote/stage-upload-url]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
