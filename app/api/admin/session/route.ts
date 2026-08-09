import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { perfLog, perfRequested } from '@/lib/perf-trace'

/** UI gate: 200 if cookie session belongs to an is_admin profile. */
export async function GET(request: Request) {
  const wantPerf = perfRequested(request)
  const gate = await assertAdmin({ perf: wantPerf })
  if (!gate.ok) {
    if (wantPerf && gate._perf) perfLog('admin/session.fail', gate._perf)
    return gate.res
  }
  const body: Record<string, unknown> = { ok: true, userId: gate.userId }
  if (wantPerf && gate._perf) {
    body._perf = { assertAdmin: gate._perf }
    perfLog('admin/session', body._perf as Record<string, unknown>)
  }
  return NextResponse.json(body)
}
