'use client'
/**
 * Thin reader over MessagingProvider — unread is derived from the same
 * conversation store (sum of per-thread unreadCount), not a parallel query.
 */
import { useMessaging } from '@/hooks/useMessaging'

export function useUnreadMessagesCount() {
  return useMessaging().unreadCount
}
