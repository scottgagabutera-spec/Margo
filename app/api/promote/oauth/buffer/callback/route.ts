import { NextResponse, type NextRequest } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { syncArtistBufferChannels } from '@/lib/promote/buffer/connections'
import {
  exchangeBufferCode,
  PROMOTE_BUFFER_RETURN_COOKIE,
  PROMOTE_BUFFER_STATE_COOKIE,
  PROMOTE_BUFFER_VERIFIER_COOKIE,
} from '@/lib/promote/buffer/oauth'
import { encryptPromoteToken } from '@/lib/promote/token-vault'

export async function GET(request: NextRequest) {
  const session = await requirePromoteSession()
  const origin = new URL(request.url).origin
  const returnTo = request.cookies.get(PROMOTE_BUFFER_RETURN_COOKIE)?.value || '/settings'
  const safeReturn = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/settings'
  const redirectBase = `${origin}${safeReturn}`

  const clearCookies = (res: NextResponse) => {
    res.cookies.delete(PROMOTE_BUFFER_STATE_COOKIE)
    res.cookies.delete(PROMOTE_BUFFER_VERIFIER_COOKIE)
    res.cookies.delete(PROMOTE_BUFFER_RETURN_COOKIE)
    return res
  }

  if (!session) {
    return clearCookies(NextResponse.redirect(`${redirectBase}?promote=denied`))
  }

  const params = request.nextUrl.searchParams
  if (params.get('error')) {
    return clearCookies(NextResponse.redirect(`${redirectBase}?promote=buffer_denied`))
  }

  const code = params.get('code')
  const state = params.get('state')
  const expectedState = request.cookies.get(PROMOTE_BUFFER_STATE_COOKIE)?.value
  const verifier = request.cookies.get(PROMOTE_BUFFER_VERIFIER_COOKIE)?.value

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return clearCookies(NextResponse.redirect(`${redirectBase}?promote=buffer_invalid`))
  }

  const admin = getPromoteAdmin()
  if (!admin) {
    return clearCookies(NextResponse.redirect(`${redirectBase}?promote=server_error`))
  }

  try {
    const tokens = await exchangeBufferCode(origin, code, verifier)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const { error: upsertErr } = await admin
      .from('artist_buffer_connections')
      .upsert({
        profile_id: session.userId,
        status: 'connected',
        access_token_enc: encryptPromoteToken(tokens.access_token),
        refresh_token_enc: tokens.refresh_token
          ? encryptPromoteToken(tokens.refresh_token)
          : null,
        token_expires_at: expiresAt,
        connected_at: new Date().toISOString(),
        last_error: null,
      }, { onConflict: 'profile_id' })

    if (upsertErr) throw upsertErr

    await admin
      .from('artist_promote_settings')
      .upsert({ profile_id: session.userId }, { onConflict: 'profile_id' })

    await syncArtistBufferChannels(admin, session.userId)

    return clearCookies(NextResponse.redirect(`${redirectBase}?promote=buffer_connected`))
  } catch (err) {
    console.error('[promote/buffer callback]', err)
    return clearCookies(NextResponse.redirect(`${redirectBase}?promote=buffer_error`))
  }
}
