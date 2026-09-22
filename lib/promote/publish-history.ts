import type { SupabaseClient } from '@supabase/supabase-js'
import type { PromotePlatform } from '@/lib/promote/types'

export interface PublishedPlatformRecord {
  platform: PromotePlatform
  publishedAt: string | null
  externalPostUrl: string | null
  queueId: string
}

/** Prior successful publishes for this Moment on each platform. */
export async function fetchPublishedPlatformsForPost(
  admin: SupabaseClient,
  profileId: string,
  postId: string,
): Promise<PublishedPlatformRecord[]> {
  const { data: queues } = await admin
    .from('promote_queue')
    .select('id')
    .eq('profile_id', profileId)
    .eq('source_post_id', postId)
    .neq('status', 'rejected')

  if (!queues?.length) return []

  const queueIds = queues.map((q) => q.id as string)
  const { data: targets } = await admin
    .from('promote_queue_targets')
    .select('queue_id, platform, status, published_at, external_post_url')
    .in('queue_id', queueIds)
    .eq('status', 'published')

  return (targets || []).map((t) => ({
    platform: t.platform as PromotePlatform,
    publishedAt: (t.published_at as string | null) ?? null,
    externalPostUrl: (t.external_post_url as string | null) ?? null,
    queueId: t.queue_id as string,
  }))
}

export function latestPublishByPlatform(
  records: PublishedPlatformRecord[],
): Map<PromotePlatform, PublishedPlatformRecord> {
  const map = new Map<PromotePlatform, PublishedPlatformRecord>()
  for (const record of records) {
    const prev = map.get(record.platform)
    if (!prev) {
      map.set(record.platform, record)
      continue
    }
    const prevAt = prev.publishedAt ? new Date(prev.publishedAt).getTime() : 0
    const nextAt = record.publishedAt ? new Date(record.publishedAt).getTime() : 0
    if (nextAt >= prevAt) map.set(record.platform, record)
  }
  return map
}
