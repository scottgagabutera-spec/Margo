import { NextResponse, type NextRequest } from 'next/server'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import {
  buildBufferAuthorizeUrl,
  buildBufferOAuthState,
  buildBufferPkcePair,
  PROMOTE_BUFFER_COOKIE_OPTS,
  PROMOTE_BUFFER_RETURN_COOKIE,
  PROMOTE_BUFFER_STATE_COOKIE,
  PROMOTE_BUFFER_VERIFIER_COOKIE,
} from '@/lib/promote/buffer/oauth'

export async function GET(request: NextRequest) {
  const session = await requirePromoteSession()
  if (!session) {
    return NextResponse.redirect(new URL('/settings?promote=denied', request.url))
  }

  const origin = new URL(request.url).origin
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/settings'
  const safeReturn = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/settings'

  try {
    const state = buildBufferOAuthState()
    const { verifier, challenge } = buildBufferPkcePair()
    const url = buildBufferAuthorizeUrl(origin, state, challenge)
    const res = NextResponse.redirect(url)
    res.cookies.set(PROMOTE_BUFFER_STATE_COOKIE, state, PROMOTE_BUFFER_COOKIE_OPTS)
    res.cookies.set(PROMOTE_BUFFER_VERIFIER_COOKIE, verifier, PROMOTE_BUFFER_COOKIE_OPTS)
    res.cookies.set(PROMOTE_BUFFER_RETURN_COOKIE, safeReturn, PROMOTE_BUFFER_COOKIE_OPTS)
    return res
  } catch (err) {
    console.error('[promote/buffer oauth]', err)
    return NextResponse.redirect(new URL(`${safeReturn}?promote=buffer_error`, request.url))
  }
}
