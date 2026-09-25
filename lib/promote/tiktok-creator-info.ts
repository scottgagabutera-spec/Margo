import { TIKTOK_OPEN_API } from '@/lib/promote/tiktok-oauth'
import { formatTikTokApiError } from '@/lib/promote/publish-error'
import type { TikTokPrivacyLevel } from '@/lib/promote/tiktok-privacy'

export interface TikTokCreatorInfo {
  creatorUsername: string | null
  creatorNickname: string | null
  privacyLevelOptions: TikTokPrivacyLevel[]
  commentDisabled: boolean
  duetDisabled: boolean
  stitchDisabled: boolean
  maxVideoPostDurationSec: number | null
}

type CreatorInfoEnvelope = {
  data?: {
    creator_username?: string
    creator_nickname?: string
    privacy_level_options?: string[]
    comment_disabled?: boolean
    duet_disabled?: boolean
    stitch_disabled?: boolean
    max_video_post_duration_sec?: number
  }
  error?: { code?: string; message?: string; log_id?: string }
}

const VALID_PRIVACY = new Set<TikTokPrivacyLevel>([
  'PUBLIC_TO_EVERYONE',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWER_OF_CREATOR',
  'SELF_ONLY',
])

function parsePrivacyOptions(raw: string[] | undefined): TikTokPrivacyLevel[] {
  if (!raw?.length) return []
  return raw.filter((v): v is TikTokPrivacyLevel => VALID_PRIVACY.has(v as TikTokPrivacyLevel))
}

export async function fetchTikTokCreatorInfo(accessToken: string): Promise<TikTokCreatorInfo> {
  const res = await fetch(`${TIKTOK_OPEN_API}/v2/post/publish/creator_info/query/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
  })
  const text = await res.text()
  let json: CreatorInfoEnvelope
  try {
    json = JSON.parse(text) as CreatorInfoEnvelope
  } catch {
    throw new Error(formatTikTokApiError(res.status, text, 'creator_info/query'))
  }
  if (!res.ok || (json.error?.code && json.error.code !== 'ok')) {
    throw new Error(formatTikTokApiError(res.status, text, '/v2/post/publish/creator_info/query/'))
  }
  const data = json.data
  return {
    creatorUsername: data?.creator_username?.trim() || null,
    creatorNickname: data?.creator_nickname?.trim() || null,
    privacyLevelOptions: parsePrivacyOptions(data?.privacy_level_options),
    commentDisabled: Boolean(data?.comment_disabled),
    duetDisabled: Boolean(data?.duet_disabled),
    stitchDisabled: Boolean(data?.stitch_disabled),
    maxVideoPostDurationSec: data?.max_video_post_duration_sec ?? null,
  }
}
