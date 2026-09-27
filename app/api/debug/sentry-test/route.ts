import { NextResponse } from 'next/server'
import { fireSentryE2ETest, isSentryTestAuthorized } from '@/lib/observability/sentry-test'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isSentryTestAuthorized(req.headers.get('x-margo-sentry-test'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const result = await fireSentryE2ETest()
  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? 'failed' }, { status: 503 })
  }
  return NextResponse.json({
    ok: true,
    eventId: result.eventId,
    hint: 'In Sentry → Issues (margo-web), search for "Margo Sentry E2E test".',
  })
}
