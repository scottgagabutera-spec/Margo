import { TIKTOK_OPEN_API } from '@/lib/promote/tiktok-oauth'
import { fetchTikTokCreatorInfo } from '@/lib/promote/tiktok-creator-info'
import {
  pickTikTokPublishPrivacyLevel,
  resolveTikTokPromotePrivacyPreference,
  type TikTokPrivacyLevel,
} from '@/lib/promote/tiktok-privacy'
import { formatTikTokApiError } from '@/lib/promote/publish-error'

export type { TikTokPrivacyLevel }

export interface TikTokPublishInput {
  accessToken: string
  title: string
  /** TikTok @handle without @ — used to build post URL when publish completes. */
  creatorUsername?: string | null
  privacyLevel?: TikTokPrivacyLevel
}

export interface TikTokPullPublishInput extends TikTokPublishInput {
  videoUrl: string
}

export interface TikTokFilePublishInput extends TikTokPublishInput {
  videoBytes: Buffer
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
const MIN_CHUNK_BYTES = 5 * 1024 * 1024
const DEFAULT_CHUNK_BYTES = 10 * 1024 * 1024

function preferPullFromUrl(): boolean {
  return process.env.TIKTOK_PROMOTE_TRANSFER?.trim().toLowerCase() === 'pull_from_url'
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

async function resolvePostInfoForPublish(
  accessToken: string,
  title: string,
  privacyOverride?: TikTokPrivacyLevel,
) {
  const creator = await fetchTikTokCreatorInfo(accessToken)
  const preference = privacyOverride ?? resolveTikTokPromotePrivacyPreference()
  const privacyLevel = pickTikTokPublishPrivacyLevel(creator.privacyLevelOptions, preference)
  return {
    postInfo: {
      title,
      privacy_level: privacyLevel,
      disable_comment: creator.commentDisabled,
      disable_duet: creator.duetDisabled,
      disable_stitch: creator.stitchDisabled,
      brand_content_toggle: false,
      brand_organic_toggle: false,
    },
    creatorUsernameFromApi: creator.creatorUsername,
  }
}

function fileUploadChunkPlan(videoSize: number): { chunkSize: number; totalChunkCount: number } {
  if (videoSize <= 0) {
    throw new Error('TikTok publish requires a non-empty video file')
  }
  if (videoSize < MIN_CHUNK_BYTES) {
    return { chunkSize: videoSize, totalChunkCount: 1 }
  }
  const chunkSize = DEFAULT_CHUNK_BYTES
  const totalChunkCount = Math.max(1, Math.ceil(videoSize / chunkSize))
  return { chunkSize, totalChunkCount }
}

async function uploadVideoChunksToTikTok(
  uploadUrl: string,
  videoBytes: Buffer,
  videoSize: number,
  chunkSize: number,
  totalChunkCount: number,
): Promise<void> {
  for (let index = 0; index < totalChunkCount; index += 1) {
    const start = index * chunkSize
    const end = Math.min(start + chunkSize, videoSize) - 1
    const chunk = videoBytes.subarray(start, end + 1)
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(chunk.length),
        'Content-Range': `bytes ${start}-${end}/${videoSize}`,
      },
      body: chunk,
    })
    if (res.status !== 201 && res.status !== 206) {
      const text = await res.text().catch(() => '')
      throw new Error(
        `TikTok video chunk upload failed (HTTP ${res.status})${text ? `: ${text.slice(0, 400)}` : ''}`,
      )
    }
  }
}

async function waitForTikTokPublishComplete(
  accessToken: string,
  publishId: string,
  creatorUsername: string | null | undefined,
): Promise<TikTokPublishResult> {
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

/**
 * Direct Post via FILE_UPLOAD — Margo sends the MP4 to TikTok (no URL ownership verification).
 * @see https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
 */
export async function publishVideoToTikTokViaFileUpload({
  accessToken,
  videoBytes,
  title,
  creatorUsername,
  privacyLevel,
}: TikTokFilePublishInput): Promise<TikTokPublishResult> {
  const videoSize = videoBytes.length
  const { chunkSize, totalChunkCount } = fileUploadChunkPlan(videoSize)
  const { postInfo, creatorUsernameFromApi } = await resolvePostInfoForPublish(
    accessToken,
    title,
    privacyLevel,
  )
  const postAs = creatorUsername ?? creatorUsernameFromApi

  const init = await tikTokPostJson<{ publish_id?: string; upload_url?: string }>(
    '/v2/post/publish/video/init/',
    accessToken,
    {
      post_info: postInfo,
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: videoSize,
        chunk_size: chunkSize,
        total_chunk_count: totalChunkCount,
      },
    },
  )

  const publishId = init.data?.publish_id
  const uploadUrl = init.data?.upload_url
  if (!publishId || !uploadUrl) {
    throw new Error('TikTok publish init succeeded but publish_id or upload_url was missing')
  }

  await uploadVideoChunksToTikTok(uploadUrl, videoBytes, videoSize, chunkSize, totalChunkCount)
  return waitForTikTokPublishComplete(accessToken, publishId, postAs)
}

/**
 * Direct Post via PULL_FROM_URL — requires verified domain/URL prefix in TikTok Developer Portal.
 * @see https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide/#pull_from_url
 */
export async function publishVideoToTikTokViaUrl({
  accessToken,
  videoUrl,
  title,
  creatorUsername,
  privacyLevel,
}: TikTokPullPublishInput): Promise<TikTokPublishResult> {
  const { postInfo, creatorUsernameFromApi } = await resolvePostInfoForPublish(
    accessToken,
    title,
    privacyLevel,
  )
  const postAs = creatorUsername ?? creatorUsernameFromApi

  const init = await tikTokPostJson<{ publish_id?: string }>(
    '/v2/post/publish/video/init/',
    accessToken,
    {
      post_info: postInfo,
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: videoUrl,
      },
    },
  )

  const publishId = init.data?.publish_id
  if (!publishId) throw new Error('TikTok publish init succeeded but no publish_id returned')

  return waitForTikTokPublishComplete(accessToken, publishId, postAs)
}

/** Default path: FILE_UPLOAD unless TIKTOK_PROMOTE_TRANSFER=pull_from_url. */
export async function publishVideoToTikTok(
  input: TikTokFilePublishInput & { videoUrl?: string | null },
): Promise<TikTokPublishResult> {
  if (preferPullFromUrl()) {
    if (!input.videoUrl) {
      throw new Error('TIKTOK_PROMOTE_TRANSFER=pull_from_url requires a public video URL')
    }
    return publishVideoToTikTokViaUrl({
      accessToken: input.accessToken,
      videoUrl: input.videoUrl,
      title: input.title,
      creatorUsername: input.creatorUsername,
      privacyLevel: input.privacyLevel,
    })
  }
  return publishVideoToTikTokViaFileUpload(input)
}
