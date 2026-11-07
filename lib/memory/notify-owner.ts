import type { SupabaseClient } from '@supabase/supabase-js'
import { isNotificationAllowed } from '@/lib/notification-prefs'

export type MemoryOwnerNotifyType = 'memory_reply' | 'memory_lyric_reply'

export async function notifyMemoryOwner(
  admin: SupabaseClient,
  opts: {
    memoryId: string
    ownerId: string
    actorId: string
    type: MemoryOwnerNotifyType
  },
): Promise<void> {
  const { memoryId, ownerId, actorId, type } = opts
  if (ownerId === actorId) return

  const prefKey = type === 'memory_lyric_reply' ? 'lyricBack' : 'lyricBack'
  const allowed = await isNotificationAllowed(admin, ownerId, prefKey)
  if (!allowed) return

  const { error } = await admin.from('notifications').insert({
    recipient_id: ownerId,
    actor_id: actorId,
    type,
    post_id: memoryId,
  })
  if (error) console.error('[notifyMemoryOwner]', error.message)
}
