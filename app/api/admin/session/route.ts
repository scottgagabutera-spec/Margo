import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { fetchAdminOverviewKpis } from '@/lib/admin-overview-kpis'
import { nowMs, perfLog, perfRequested } from '@/lib/perf-trace'

/**
 * UI gate: 200 if cookie session belongs to an is_admin profile.
 * Optional `?overview=1` — one assertAdmin then Overview KPI pack (cold /admin default).
 */
export async function GET(request: Request) {
  const wantPerf = perfRequested(request)
  const tRoute0 = nowMs()
  const url = new URL(request.url)
  const includeOverview =
    url.searchParams.get('overview') === '1' || url.searchParams.get('overview') === 'true'

  const gate = await assertAdmin({ perf: wantPerf })
  if (!gate.ok) {
    if (wantPerf && gate._perf) perfLog('admin/session.fail', gate._perf)
    return gate.res
  }

  const body: Record<string, unknown> = { ok: true, userId: gate.userId }

  let queryMs: Record<string, number> | null = null
  if (includeOverview) {
    const kpis = await fetchAdminOverviewKpis()
    if (!kpis.ok) {
      console.error('[admin/session] overview KPIs failed:', kpis.error)
      return NextResponse.json({ error: kpis.error }, { status: 500 })
    }
    body.overview = kpis.data
    queryMs = kpis.queryMs
  }

  if (wantPerf) {
    const _perf: Record<string, unknown> = {
      assertAdmin: gate._perf ?? null,
      includeOverview,
      handlerTotalMs: Math.round(nowMs() - tRoute0),
    }
    if (queryMs) {
      const queryValues = Object.values(queryMs)
      _perf.queryMs = queryMs
      _perf.slowestQueryMs = Math.max(...queryValues)
      _perf.parallelQueriesMs = Math.max(...queryValues)
    }
    body._perf = _perf
    perfLog('admin/session', _perf)
  }

  return NextResponse.json(body)
}
