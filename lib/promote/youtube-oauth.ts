import { randomBytes, createHash } from 'crypto'

export const YOUTUBE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload'
export const YOUTUBE_READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'

const PROMOTE_OAUTH_STATE_COOKIE = 'margo_promote_youtube_oauth_state'
const PROMOTE_OAUTH_VERIFIER_COOKIE = 'margo_promote_youtube_pkce_verifier'
const PROMOTE_OAUTH_RETURN_COOKIE = 'margo_promote_youtube_return'

export const PROMOTE_YOUTUBE_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 10,
}

export {
  PROMOTE_OAUTH_STATE_COOKIE,
  PROMOTE_OAUTH_VERIFIER_COOKIE,
  PROMOTE_OAUTH_RETURN_COOKIE,
}

function googleClientId(): string {
  const id = process.env.GOOGLE_PROMOTE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  if (!id) throw new Error('GOOGLE_PROMOTE_CLIENT_ID is not configured')
  return id
}

function googleClientSecret(): string {
  const secret = process.env.GOOGLE_PROMOTE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
  if (!secret) throw new Error('GOOGLE_PROMOTE_CLIENT_SECRET is not configured')
  return secret
}

export function buildYouTubeOAuthState(): string {
  return randomBytes(24).toString('base64url')
}

export function buildPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function buildYouTubeAuthorizeUrl(origin: string, state: string, codeChallenge: string): string {
  const redirectUri = `${origin}/api/promote/oauth/youtube/callback`
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [YOUTUBE_UPLOAD_SCOPE, YOUTUBE_READONLY_SCOPE].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export interface YouTubeTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
}

export async function exchangeYouTubeCode(
  origin: string,
  code: string,
  codeVerifier: string,
): Promise<YouTubeTokenResponse> {
  const redirectUri = `${origin}/api/promote/oauth/youtube/callback`
  const body = new URLSearchParams({
    client_id: googleClientId(),
    client_secret: googleClientSecret(),
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`YouTube token exchange failed: ${text}`)
  }
  return res.json() as Promise<YouTubeTokenResponse>
}

export async function refreshYouTubeAccessToken(refreshToken: string): Promise<YouTubeTokenResponse> {
  const body = new URLSearchParams({
    client_id: googleClientId(),
    client_secret: googleClientSecret(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`YouTube token refresh failed: ${text}`)
  }
  return res.json() as Promise<YouTubeTokenResponse>
}

export interface YouTubeChannelInfo {
  channelId: string
  title: string
}

export async function fetchYouTubeChannel(accessToken: string): Promise<YouTubeChannelInfo> {
  const params = new URLSearchParams({
    part: 'snippet',
    mine: 'true',
  })
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`YouTube channels.list failed: ${text}`)
  }
  const json = await res.json() as {
    items?: Array<{ id: string; snippet?: { title?: string } }>
  }
  const item = json.items?.[0]
  if (!item?.id) throw new Error('No YouTube channel found for this Google account')
  return { channelId: item.id, title: item.snippet?.title || 'YouTube' }
}
