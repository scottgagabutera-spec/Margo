import { NextRequest, NextResponse } from 'next/server'
import { syncMargoSearchFromWebhook } from '@/lib/meilisearch/sync'

/**
 * Supabase Database Webhook target for Meilisearch sync.
 * Configure webhooks on: profiles, posts, lyric_lines (INSERT/UPDATE/DELETE).
 * Set MEILISEARCH_WEBHOOK_SECRET and send as `x-margo-webhook-secret` header.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.MEILISEARCH_WEBHOOK_SECRET
  if (secret) {
    const header = request.headers.get('x-margo-webhook-secret')
    if (header !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const payload = await request.json()
    const events = Array.isArray(payload) ? payload : [payload]
    for (const event of events) {
      await syncMargoSearchFromWebhook({
        type: event.type,
        table: event.table,
        record: event.record ?? null,
        old_record: event.old_record ?? null,
      })
    }
    return NextResponse.json({ ok: true, processed: events.length })
  } catch (e) {
    console.error('[meilisearch-sync]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sync failed' },
      { status: 500 },
    )
  }
}
