'use client'
/**
 * Thin reader over MessagingProvider — conversation list + Realtime live
 * in hooks/useMessaging.tsx so badge, inbox, and thread stay in sync.
 */
export type { Conversation, ConversationPartner } from '@/hooks/useMessaging'

import { useMessaging } from '@/hooks/useMessaging'

export function useConversations() {
  const { inbox, requests, loading } = useMessaging()
  return { inbox, requests, loading }
}
