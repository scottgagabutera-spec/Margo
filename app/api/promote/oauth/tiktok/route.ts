import { NextResponse, type NextRequest } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { buildPromoteOAuthReturnUrl } from '@/lib/promote/oauth-return-redirect'
import { gatePromoteOAuthStart } from '@/lib/promote/oauth-start-handler'
import { createTikTokOAuthPending } from '@/lib/promote/tiktok-oauth-pending'
import {
  buildTikTokAuthorizeUrl,
  buildTikTokOAuthState,
  PROMOTE_TIKTOK_COOKIE_OPTS,
  PROMOTE_TIKTOK_RETURN_COOKIE,
  PROMOTE_TIKTOK_STATE_COOKIE,
} from '@/lib/promote/tiktok-oauth'

const TIKTOK_PENDING_WRITE_TIMEOUT_MS = 12_000

export async function GET(request: NextRequest) {
  const gate = await gatePromoteOAuthStart(request, 'tiktok_error')
  if (!gate.allowed) return gate.response

  const { origin, safeReturn, userId } = gate

  const admin = getPromoteAdmin()
  if (!admin) {
    return NextResponse.redirect(
      buildPromoteOAuthReturnUrl(origin, safeReturn, 'server_error'),
    )
  }

  try {
    const state = buildTikTokOAuthState()
    await Promise.race([
      createTikTokOAuthPending(admin, state, userId, safeReturn),
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('TikTok pending write timed out')), TIKTOK_PENDING_WRITE_TIMEOUT_MS)
      }),
    ])
    const url = buildTikTokAuthorizeUrl(origin, state)
    const res = NextResponse.redirect(url)
    res.cookies.set(PROMOTE_TIKTOK_STATE_COOKIE, state, PROMOTE_TIKTOK_COOKIE_OPTS)
    res.cookies.set(PROMOTE_TIKTOK_RETURN_COOKIE, safeReturn, PROMOTE_TIKTOK_COOKIE_OPTS)
    return res
  } catch (err) {
    console.error('[promote/tiktok oauth]', err)
    return NextResponse.redirect(
      buildPromoteOAuthReturnUrl(origin, safeReturn, 'tiktok_error'),
    )
  }
}
