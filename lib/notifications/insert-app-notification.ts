import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificationType } from '@/hooks/useNotifications'

type InsertInput = {
  recipientId: string
  type: NotificationType
  actorId?: string | null
  postId?: string | null
  messageId?: string | null
}

/**
 * Single insert path for server-side notifications. Skips when actor and recipient
 * are the same user (engagement self-notify guard).
 */
export async function insertAppNotification(
  admin: SupabaseClient,
  input: InsertInput,
): Promise<{ ok: boolean; skipped?: boolean }> {
  const actorId = input.actorId ?? null
  if (actorId && actorId === input.recipientId) {
    return { ok: true, skipped: true }
  }

  const row: Record<string, unknown> = {
    recipient_id: input.recipientId,
    type: input.type,
    actor_id: actorId,
  }
  if (input.postId) row.post_id = input.postId
  if (input.messageId) row.message_id = input.messageId

  const { error } = await admin.from('notifications').insert(row)
  if (error) {
    console.error('[insertAppNotification]', input.type, error.message)
    return { ok: false }
  }
  return { ok: true }
}
