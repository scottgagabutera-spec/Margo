import { NextResponse } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { runPromoteCleanupJob } from '@/lib/promote/cleanup-orchestrator'

export const runtime = 'nodejs'
export const maxDuration = 60

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

/** Vercel Cron — expire pending/rejected queue rows (2h) + retry orphan R2 staging deletes. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getPromoteAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  try {
    const result = await runPromoteCleanupJob(admin)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Promote cleanup failed'
    console.error('[promote/cleanup] cron error', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
