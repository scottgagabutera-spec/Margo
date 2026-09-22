import { getPublishAdapter, resolvePublishAdapterKind } from '@/lib/promote/adapters/registry'
import type {
  PlatformPublishInput,
  PlatformPublishResult,
  PublishAdapterContext,
  SocialConnectionRow,
} from '@/lib/promote/adapters/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PromotePlatform, PublishAdapterKind } from '@/lib/promote/types'

export type { PlatformPublishInput, PlatformPublishResult, SocialConnectionRow }

export async function publishVideoViaAdapter(
  admin: SupabaseClient,
  profileId: string,
  platform: PromotePlatform,
  adapterKind: PublishAdapterKind,
  connection: SocialConnectionRow | null,
  videoBytes: Buffer,
  videoPublicUrl: string,
  input: PlatformPublishInput,
): Promise<PlatformPublishResult> {
  const adapter = getPublishAdapter(adapterKind)
  const ctx: PublishAdapterContext = {
    admin,
    profileId,
    platform,
    adapter: adapterKind,
    connection,
    videoBytes,
    videoPublicUrl,
    input,
  }
  return adapter.publish(ctx)
}

export function adapterKindFromConnection(
  connection: SocialConnectionRow | null | undefined,
): PublishAdapterKind {
  return resolvePublishAdapterKind(connection?.publish_adapter)
}
