import { NextResponse, type NextRequest } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { saveFacebookPageConnection } from '@/lib/promote/facebook-connection'
import {
  exchangeFacebookCode,
  exchangeFacebookLongLivedToken,
  fetchFacebookManagedPages,
  PROMOTE_FACEBOOK_COOKIE_OPTS,
  PROMOTE_FACEBOOK_PENDING_COOKIE,
  PROMOTE_FACEBOOK_RETURN_COOKIE,
  PROMOTE_FACEBOOK_STATE_COOKIE,
} from '@/lib/promote/facebook-oauth'
import { encryptPromoteToken } from '@/lib/promote/token-vault'

export async function GET(request: NextRequest) {
  const session = await requirePromoteSession()
  const origin = new URL(request.url).origin
  const returnTo = request.cookies.get(PROMOTE_FACEBOOK_RETURN_COOKIE)?.value || '/settings'
  const safeReturn = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/settings'
  const redirectBase = `${origin}${safeReturn}`

  const clearOAuthCookies = (res: NextResponse) => {
    res.cookies.delete(PROMOTE_FACEBOOK_STATE_COOKIE)
    res.cookies.delete(PROMOTE_FACEBOOK_RETURN_COOKIE)
    return res
  }

  if (!session) {
    return clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=denied`))
  }

  const params = request.nextUrl.searchParams
  if (params.get('error')) {
    return clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=facebook_denied`))
  }

  const code = params.get('code')
  const state = params.get('state')
  const expectedState = request.cookies.get(PROMOTE_FACEBOOK_STATE_COOKIE)?.value

  if (!code || !state || !expectedState || state !== expectedState) {
    return clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=facebook_invalid`))
  }

  const admin = getPromoteAdmin()
  if (!admin) {
    return clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=server_error`))
  }

  try {
    const short = await exchangeFacebookCode(origin, code)
    const longLived = await exchangeFacebookLongLivedToken(short.access_token)
    const pages = await fetchFacebookManagedPages(longLived.access_token)

    if (pages.length === 0) {
      return clearOAuthCookies(
        NextResponse.redirect(`${redirectBase}?promote=facebook_no_pages`),
      )
    }

    if (pages.length === 1) {
      await saveFacebookPageConnection(admin, session.userId, pages[0], longLived.access_token)
      return clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=facebook_connected`))
    }

    const pendingPayload = encryptPromoteToken(JSON.stringify({
      userAccessToken: longLived.access_token,
      pages: pages.map((p) => ({ id: p.id, name: p.name, accessToken: p.accessToken })),
    }))

    const res = clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=facebook_pick_page`))
    res.cookies.set(PROMOTE_FACEBOOK_PENDING_COOKIE, pendingPayload, PROMOTE_FACEBOOK_COOKIE_OPTS)
    return res
  } catch (err) {
    console.error('[promote/facebook callback]', err)
    return clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=facebook_error`))
  }
}
