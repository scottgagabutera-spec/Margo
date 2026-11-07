import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { RateLimitResult } from '@/lib/api-rate-limit'

function dayStartUtc(d: Date): string {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x.toISOString()
}

function secondsUntilNextDayUtc(d: Date): number {
  const next = new Date(d)
  next.setUTCHours(0, 0, 0, 0)
  next.setUTCDate(next.getUTCDate() + 1)
  return Math.max(1, Math.ceil((next.getTime() - d.getTime()) / 1000))
}

/** Per-user daily bucket in api_rate_limits (window_start = UTC midnight). */
export async function consumeDailyApiRateLimit(opts: {
  route: string
  bucket: string
  limit: number
  failOpenOnDbError?: boolean
}): Promise<RateLimitResult> {
  const windowStart = dayStartUtc(new Date())
  const admin = getSupabaseAdmin()
  if (!admin) {
    if (opts.failOpenOnDbError) return { ok: true }
    return { ok: false, retryAfterSec: 86400 }
  }

  const { data: row, error: readErr } = await admin
    .from('api_rate_limits')
    .select('count')
    .eq('route', opts.route)
    .eq('bucket', opts.bucket)
    .eq('window_start', windowStart)
    .maybeSingle()

  if (readErr) {
    console.error('[api-rate-limit-daily] read failed', readErr.message)
    if (opts.failOpenOnDbError) return { ok: true }
    return { ok: false, retryAfterSec: secondsUntilNextDayUtc(new Date()) }
  }

  const current = Number(row?.count ?? 0)
  if (current >= opts.limit) {
    return { ok: false, retryAfterSec: secondsUntilNextDayUtc(new Date()) }
  }

  const { error: writeErr } = await admin.from('api_rate_limits').upsert(
    {
      route: opts.route,
      bucket: opts.bucket,
      window_start: windowStart,
      count: current + 1,
    },
    { onConflict: 'route,bucket,window_start' },
  )

  if (writeErr) {
    console.error('[api-rate-limit-daily] write failed', writeErr.message)
    if (opts.failOpenOnDbError) return { ok: true }
    return { ok: false, retryAfterSec: secondsUntilNextDayUtc(new Date()) }
  }

  return { ok: true }
}
