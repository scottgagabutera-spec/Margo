import { type NextRequest, NextResponse } from 'next/server'
import { completeOAuthCodeExchange } from '@/lib/oauth-complete-session'

/** Completes Google/Discord PKCE after the callback page has painted status UI. */
export async function POST(request: NextRequest) {
  let code: string | null = null
  try {
    const body = await request.json() as { code?: unknown }
    code = typeof body.code === 'string' ? body.code : null
  } catch {
    return NextResponse.json({ redirectTo: '/signin?error=auth' })
  }
  return completeOAuthCodeExchange(request, code)
}
