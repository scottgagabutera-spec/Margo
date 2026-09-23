import { NextResponse, type NextRequest } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { saveTikTokConnection } from '@/lib/promote/tiktok-connection'
import {
  exchangeTikTokCode,
  fetchTikTokUserInfo,
  PROMOTE_TIKTOK_RETURN_COOKIE,
  PROMOTE_TIKTOK_STATE_COOKIE,
} from '@/lib/promote/tiktok-oauth'

export async function GET(request: NextRequest) {
  const session = await requirePromoteSession()
  const origin = new URL(request.url).origin
  const returnTo = request.cookies.get(PROMOTE_TIKTOK_RETURN_COOKIE)?.value || '/settings'
  const safeReturn = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/settings'
  const redirectBase = `${origin}${safeReturn}`

  const clearOAuthCookies = (res: NextResponse) => {
    res.cookies.delete(PROMOTE_TIKTOK_STATE_COOKIE)
    res.cookies.delete(PROMOTE_TIKTOK_RETURN_COOKIE)
    return res
  }

  if (!session) {
    return clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=denied`))
  }

  const params = request.nextUrl.searchParams
  if (params.get('error')) {
    return clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=tiktok_denied`))
  }

  const code = params.get('code')
  const state = params.get('state')
  const expectedState = request.cookies.get(PROMOTE_TIKTOK_STATE_COOKIE)?.value

  if (!code || !state || !expectedState || state !== expectedState) {
    return clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=tiktok_invalid`))
  }

  const admin = getPromoteAdmin()
  if (!admin) {
    return clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=server_error`))
  }

  try {
    const tokens = await exchangeTikTokCode(origin, code)
    const user = await fetchTikTokUserInfo(tokens.access_token)
    await saveTikTokConnection(admin, session.userId, tokens, user)
    return clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=tiktok_connected`))
  } catch (err) {
    console.error('[promote/tiktok callback]', err)
    return clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=tiktok_error`))
  }
}
