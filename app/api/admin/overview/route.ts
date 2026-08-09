import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { fetchAdminOverviewKpis } from '@/lib/admin-overview-kpis'
import { nowMs, perfLog, perfRequested } from '@/lib/perf-trace'

/**
 * Glance KPIs for admin overview — exact service-role counts (not list caps).
 * Shared KPI loader: lib/admin-overview-kpis.ts (also used by session?overview=1).
 */
export async function GET(request: Request) {
  const wantPerf = perfRequested(request)
  const tRoute0 = nowMs()

  const gate = await assertAdmin({ perf: wantPerf })
  if (!gate.ok) {
    if (wantPerf && gate._perf) {
      perfLog('admin/overview.assertAdmin.fail', gate._perf)
    }
    return gate.res
  }

  try {
    const kpis = await fetchAdminOverviewKpis()
    if (!kpis.ok) {
      console.error('[admin/overview] query failed:', kpis.error)
      return NextResponse.json({ error: kpis.error }, { status: 500 })
    }

    const body: Record<string, unknown> = { ...kpis.data }

    if (wantPerf) {
      const queryValues = Object.values(kpis.queryMs)
      const _perf = {
        assertAdmin: gate._perf ?? null,
        queryMs: kpis.queryMs,
        slowestQueryMs: Math.max(...queryValues),
        parallelQueriesMs: Math.max(...queryValues),
        handlerTotalMs: Math.round(nowMs() - tRoute0),
      }
      body._perf = _perf
      perfLog('admin/overview', _perf)
    }

    return NextResponse.json(body)
  } catch (e: any) {
    console.error('[admin/overview] failed:', e)
    return NextResponse.json({ error: e?.message || 'Failed to load overview' }, { status: 500 })
  }
}
