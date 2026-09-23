import { NextResponse, type NextRequest } from 'next/server'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import {
  buildTikTokAuthorizeUrl,
  buildTikTokOAuthState,
  PROMOTE_TIKTOK_COOKIE_OPTS,
  PROMOTE_TIKTOK_RETURN_COOKIE,
  PROMOTE_TIKTOK_STATE_COOKIE,
} from '@/lib/promote/tiktok-oauth'

export async function GET(request: NextRequest) {
  const session = await requirePromoteSession()
  if (!session) {
    return NextResponse.redirect(new URL('/settings?promote=denied', request.url))
  }

  const origin = new URL(request.url).origin
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/settings'
  const safeReturn = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/settings'

  try {
    const state = buildTikTokOAuthState()
    const url = buildTikTokAuthorizeUrl(origin, state)
    const res = NextResponse.redirect(url)
    res.cookies.set(PROMOTE_TIKTOK_STATE_COOKIE, state, PROMOTE_TIKTOK_COOKIE_OPTS)
    res.cookies.set(PROMOTE_TIKTOK_RETURN_COOKIE, safeReturn, PROMOTE_TIKTOK_COOKIE_OPTS)
    return res
  } catch (err) {
    console.error('[promote/tiktok oauth]', err)
    return NextResponse.redirect(new URL(`${safeReturn}?promote=tiktok_error`, request.url))
  }
}
