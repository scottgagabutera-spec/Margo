import { NextResponse, type NextRequest } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { saveFacebookPageConnection } from '@/lib/promote/facebook-connection'
import { saveFacebookPagePending } from '@/lib/promote/facebook-page-pending'
import {
  exchangeFacebookCode,
  exchangeFacebookLongLivedToken,
  fetchFacebookManagedPages,
  PROMOTE_FACEBOOK_COOKIE_OPTS,
  PROMOTE_FACEBOOK_PENDING_COOKIE,
  PROMOTE_FACEBOOK_RETURN_COOKIE,
  PROMOTE_FACEBOOK_STATE_COOKIE,
} from '@/lib/promote/facebook-oauth'
import { buildPromoteOAuthReturnUrl } from '@/lib/promote/oauth-return-redirect'
import { resolvePromoteOAuthOrigin } from '@/lib/promote/oauth-public-origin'
import { encryptPromoteToken } from '@/lib/promote/token-vault'

export async function GET(request: NextRequest) {
  const session = await requirePromoteSession()
  const origin = resolvePromoteOAuthOrigin(request)
  const returnTo = request.cookies.get(PROMOTE_FACEBOOK_RETURN_COOKIE)?.value || '/settings'

  const clearOAuthCookies = (res: NextResponse) => {
    res.cookies.delete(PROMOTE_FACEBOOK_STATE_COOKIE)
    res.cookies.delete(PROMOTE_FACEBOOK_RETURN_COOKIE)
    return res
  }

  const redirect = (promote: string) => clearOAuthCookies(
    NextResponse.redirect(buildPromoteOAuthReturnUrl(origin, returnTo, promote)),
  )

  if (!session) {
    return redirect('denied')
  }

  const params = request.nextUrl.searchParams
  if (params.get('error')) {
    return redirect('facebook_denied')
  }

  const code = params.get('code')
  const state = params.get('state')
  const expectedState = request.cookies.get(PROMOTE_FACEBOOK_STATE_COOKIE)?.value

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirect('facebook_invalid')
  }

  const admin = getPromoteAdmin()
  if (!admin) {
    return redirect('server_error')
  }

  try {
    const short = await exchangeFacebookCode(origin, code)
    const longLived = await exchangeFacebookLongLivedToken(short.access_token)
    const pages = await fetchFacebookManagedPages(longLived.access_token)

    if (pages.length === 0) {
      return redirect('facebook_no_pages')
    }

    if (pages.length === 1) {
      await saveFacebookPageConnection(admin, session.userId, pages[0], longLived.access_token)
      return redirect('facebook_connected')
    }

    const pendingPayload = encryptPromoteToken(JSON.stringify({
      userAccessToken: longLived.access_token,
      pages: pages.map((p) => ({ id: p.id, name: p.name, accessToken: p.accessToken })),
    }))

    await saveFacebookPagePending(admin, session.userId, pendingPayload)

    const res = redirect('facebook_pick_page')
    if (pendingPayload.length <= 3800) {
      res.cookies.set(PROMOTE_FACEBOOK_PENDING_COOKIE, pendingPayload, PROMOTE_FACEBOOK_COOKIE_OPTS)
    }
    return res
  } catch (err) {
    console.error('[promote/facebook callback]', err)
    return redirect('facebook_error')
  }
}
