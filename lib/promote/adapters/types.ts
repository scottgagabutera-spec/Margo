import type { SupabaseClient } from '@supabase/supabase-js'
import type { PublishAdapterKind } from '@/lib/promote/types'
import type { PromotePlatform } from '@/lib/promote/types'

export interface PlatformPublishInput {
  songTitle: string
  lyricText: string
  artistName: string
  publisherUsername?: string | null
  privacyStatus?: 'public' | 'unlisted' | 'private'
}

export interface PlatformPublishResult {
  platform: PromotePlatform
  postId: string
  postUrl: string
}

export type SocialConnectionRow = {
  id: string
  profile_id: string
  platform: PromotePlatform
  status: string
  publish_adapter?: PublishAdapterKind | string
  external_account_id: string | null
  external_username: string | null
  access_token_enc: string
  refresh_token_enc: string | null
  token_expires_at: string | null
  scopes: string[] | null
  platform_meta?: Record<string, unknown> | null
  connected_at: string
  last_publish_at: string | null
  last_error: string | null
}

export interface PublishAdapterContext {
  admin: SupabaseClient
  profileId: string
  platform: PromotePlatform
  adapter: PublishAdapterKind
  connection: SocialConnectionRow | null
  videoBytes: Buffer
  videoPublicUrl: string
  input: PlatformPublishInput
}

export interface PublishAdapter {
  kind: PublishAdapterKind
  publish(ctx: PublishAdapterContext): Promise<PlatformPublishResult>
}
