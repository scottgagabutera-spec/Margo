import { randomBytes } from 'crypto'
import { fetchWithTimeout } from '@/lib/promote/fetch-with-timeout'

export const FACEBOOK_GRAPH_VERSION = 'v21.0'

export const FACEBOOK_PROMOTE_SCOPES = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'public_profile',
].join(',')

const PROMOTE_FACEBOOK_STATE_COOKIE = 'margo_promote_facebook_oauth_state'
const PROMOTE_FACEBOOK_RETURN_COOKIE = 'margo_promote_facebook_return'
export const PROMOTE_FACEBOOK_PENDING_COOKIE = 'margo_promote_facebook_pending_pages'

export const PROMOTE_FACEBOOK_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 10,
}

export {
  PROMOTE_FACEBOOK_STATE_COOKIE,
  PROMOTE_FACEBOOK_RETURN_COOKIE,
}

export interface FacebookPageOption {
  id: string
  name: string
  accessToken: string
}

function facebookAppId(): string {
  const id = process.env.FACEBOOK_PROMOTE_APP_ID?.trim()
  if (!id) throw new Error('FACEBOOK_PROMOTE_APP_ID is not configured')
  return id
}

function facebookAppSecret(): string {
  const secret = process.env.FACEBOOK_PROMOTE_APP_SECRET?.trim()
  if (!secret) throw new Error('FACEBOOK_PROMOTE_APP_SECRET is not configured')
  return secret
}

export function buildFacebookOAuthState(): string {
  return randomBytes(24).toString('base64url')
}

export function buildFacebookAuthorizeUrl(origin: string, state: string): string {
  const redirectUri = `${origin}/api/promote/oauth/facebook/callback`
  const params = new URLSearchParams({
    client_id: facebookAppId(),
    redirect_uri: redirectUri,
    state,
    scope: FACEBOOK_PROMOTE_SCOPES,
    response_type: 'code',
  })
  return `https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth?${params.toString()}`
}

export interface FacebookTokenResponse {
  access_token: string
  token_type?: string
  expires_in?: number
}

export async function exchangeFacebookCode(origin: string, code: string): Promise<FacebookTokenResponse> {
  const redirectUri = `${origin}/api/promote/oauth/facebook/callback`
  const params = new URLSearchParams({
    client_id: facebookAppId(),
    client_secret: facebookAppSecret(),
    redirect_uri: redirectUri,
    code,
  })
  const res = await fetchWithTimeout(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token?${params.toString()}`,
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Facebook token exchange failed: ${text}`)
  }
  return res.json() as Promise<FacebookTokenResponse>
}

/** Exchange a short-lived user token for a long-lived user token (~60 days). */
export async function exchangeFacebookLongLivedToken(shortLivedToken: string): Promise<FacebookTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: facebookAppId(),
    client_secret: facebookAppSecret(),
    fb_exchange_token: shortLivedToken,
  })
  const res = await fetchWithTimeout(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token?${params.toString()}`,
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Facebook long-lived token exchange failed: ${text}`)
  }
  return res.json() as Promise<FacebookTokenResponse>
}

export async function fetchFacebookManagedPages(userAccessToken: string): Promise<FacebookPageOption[]> {
  const params = new URLSearchParams({
    fields: 'id,name,access_token',
    access_token: userAccessToken,
  })
  const res = await fetchWithTimeout(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me/accounts?${params.toString()}`,
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Facebook pages list failed: ${text}`)
  }
  const json = await res.json() as {
    data?: Array<{ id: string; name: string; access_token?: string }>
    error?: { message?: string }
  }
  if (json.error?.message) throw new Error(json.error.message)
  return (json.data || [])
    .filter((page) => page.id && page.name && page.access_token)
    .map((page) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token as string,
    }))
}
