import { NextResponse } from 'next/server'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { getTikTokPromoteEnvDiagnostics } from '@/lib/promote/tiktok-env-diagnostics'

/**
 * Safe TikTok promote env probe for operators (active promote artists only).
 * Never returns full client_key or client_secret.
 */
export async function GET() {
  const session = await requirePromoteSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(getTikTokPromoteEnvDiagnostics())
}
