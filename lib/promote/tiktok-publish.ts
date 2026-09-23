import { TIKTOK_OPEN_API } from '@/lib/promote/tiktok-oauth'
import { formatTikTokApiError } from '@/lib/promote/publish-error'

export type TikTokPrivacyLevel =
  | 'PUBLIC_TO_EVERYONE'
  | 'MUTUAL_FOLLOW_FRIENDS'
  | 'FOLLOWER_OF_CREATOR'
  | 'SELF_ONLY'

export interface TikTokPullPublishInput {
  accessToken: string
  videoUrl: string
  title: string
  /** TikTok @handle without @ — used to build post URL when publish completes. */
  creatorUsername?: string | null
  privacyLevel?: TikTokPrivacyLevel
}

export interface TikTokPublishResult {
  publishId: string
  postId: string | null
  postUrl: string | null
}

type TikTokApiEnvelope<T> = {
  data?: T
  error?: { code?: string; message?: string; log_id?: string }
}

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 180_000

function defaultPrivacyLevel(): TikTokPrivacyLevel {
  const raw = process.env.TIKTOK_PROMOTE_PRIVACY_LEVEL?.trim()
  if (
    raw === 'PUBLIC_TO_EVERYONE'
    || raw === 'MUTUAL_FOLLOW_FRIENDS'
    || raw === 'FOLLOWER_OF_CREATOR'
    || raw === 'SELF_ONLY'
  ) {
    return raw
  }
  // Unaudited TikTok apps must post non-public until app review clears.
  return 'SELF_ONLY'
}

async function tikTokPostJson<T>(
  path: string,
  accessToken: string,
  body?: Record<string, unknown>,
): Promise<TikTokApiEnvelope<T>> {
  const res = await fetch(`${TIKTOK_OPEN_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json: TikTokApiEnvelope<T>
  try {
    json = JSON.parse(text) as TikTokApiEnvelope<T>
  } catch {
    throw new Error(formatTikTokApiError(res.status, text, 'API call'))
  }
  if (!res.ok || (json.error?.code && json.error.code !== 'ok')) {
    throw new Error(formatTikTokApiError(res.status, text, path))
  }
  return json
}

function buildPostUrl(username: string | null | undefined, postId: string): string | null {
  const handle = username?.replace(/^@/, '').trim()
  if (!handle) return null
  return `https://www.tiktok.com/@${handle}/video/${postId}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Direct Post via PULL_FROM_URL — TikTok fetches the public R2 MP4.
 * @see https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
 */
export async function publishVideoToTikTokViaUrl({
  accessToken,
  videoUrl,
  title,
  creatorUsername,
  privacyLevel = defaultPrivacyLevel(),
}: TikTokPullPublishInput): Promise<TikTokPublishResult> {
  const init = await tikTokPostJson<{ publish_id?: string }>(
    '/v2/post/publish/video/init/',
    accessToken,
    {
      post_info: {
        title,
        privacy_level: privacyLevel,
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: videoUrl,
      },
    },
  )

  const publishId = init.data?.publish_id
  if (!publishId) throw new Error('TikTok publish init succeeded but no publish_id returned')

  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    const status = await tikTokPostJson<{
      status?: string
      fail_reason?: string
      publicaly_available_post_id?: string[]
    }>(
      '/v2/post/publish/status/fetch/',
      accessToken,
      { publish_id: publishId },
    )

    const state = status.data?.status
    if (state === 'FAILED') {
      const reason = status.data?.fail_reason || 'unknown'
      throw new Error(`TikTok publish failed: ${reason}`)
    }

    if (state === 'PUBLISH_COMPLETE') {
      const postId = status.data?.publicaly_available_post_id?.[0] ?? null
      return {
        publishId,
        postId,
        postUrl: postId ? buildPostUrl(creatorUsername, postId) : null,
      }
    }

    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error(
    `TikTok publish timed out after ${Math.round(POLL_TIMEOUT_MS / 1000)}s (publish_id=${publishId}). ` +
    'The video may still finish processing on TikTok — check the creator account.',
  )
}
