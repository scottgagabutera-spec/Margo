'use client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useForegroundCatchup } from '@/hooks/useForegroundCatchup'

const supabase = createClient()

export interface ConversationPartner {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export interface Conversation {
  otherUser: ConversationPartner
  lastMessage: { body: string; createdAt: string; senderId: string }
  unreadCount: number
  // In the main Inbox if we mutually follow each other, or if I've ever
  // replied in this thread (replying = accepting a request, same as
  // Instagram/TikTok). Otherwise it sits in Requests.
  accepted: boolean
}

interface RawMessage {
  id: string
  sender_id: string
  recipient_id: string
  body: string
  read_at: string | null
  created_at: string
}

export const CONVERSATIONS_PAGE_SIZE = 30
const MESSAGE_FETCH_BATCH = 300

interface MessagingContextValue {
  conversations: Conversation[]
  inbox: Conversation[]
  requests: Conversation[]
  unreadCount: number
  loading: boolean
  loadingMoreConversations: boolean
  hasMoreConversations: boolean
  loadMoreConversations: () => void
  /** Immediate inbox/badge update after a successful send (no remount wait). */
  applyOutboundMessage: (args: {
    otherUser: ConversationPartner
    body: string
    createdAt: string
    senderId: string
  }) => void
  refetch: () => Promise<void>
  /** Drop unread for a partner after opening their thread / marking read. */
  clearUnreadForPartner: (partnerId: string) => void
}

const MessagingContext = createContext<MessagingContextValue | null>(null)

function sortByLastMessage(list: Conversation[]): Conversation[] {
  return [...list].sort(
    (a, b) =>
      new Date(b.lastMessage.createdAt).getTime() -
      new Date(a.lastMessage.createdAt).getTime()
  )
}

function partnerCountFromMessages(msgs: RawMessage[], uid: string): number {
  const set = new Set<string>()
  for (const m of msgs) {
    set.add(m.sender_id === uid ? m.recipient_id : m.sender_id)
  }
  return set.size
}

async function buildConversationsFromMessages(
  msgs: RawMessage[],
  uid: string,
): Promise<Conversation[]> {
  const byOther = new Map<string, RawMessage[]>()
  for (const m of msgs) {
    const otherId = m.sender_id === uid ? m.recipient_id : m.sender_id
    const list = byOther.get(otherId) || []
    list.push(m)
    byOther.set(otherId, list)
  }

  const otherIds = [...byOther.keys()]
  if (otherIds.length === 0) return []

  const [{ data: profiles }, { data: followsOut }, { data: followsIn }] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', otherIds),
    supabase.from('follows').select('followee_id, status').eq('follower_id', uid).in('followee_id', otherIds),
    supabase.from('follows').select('follower_id, status').eq('followee_id', uid).in('follower_id', otherIds),
  ])

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  const iFollow = new Set((followsOut || []).filter(f => f.status === 'accepted').map(f => f.followee_id))
  const followsMe = new Set((followsIn || []).filter(f => f.status === 'accepted').map(f => f.follower_id))

  return sortByLastMessage(
    otherIds.map(otherId => {
      const thread = byOther.get(otherId)!
      const last = thread[0]
      const unreadCount = thread.filter(m => m.recipient_id === uid && !m.read_at).length
      const iHaveReplied = thread.some(m => m.sender_id === uid)
      const mutual = iFollow.has(otherId) && followsMe.has(otherId)
      const profile = profileMap.get(otherId)
      return {
        otherUser: {
          id: otherId,
          username: profile?.username || 'unknown',
          displayName: profile?.display_name || 'Unknown',
          avatarUrl: profile?.avatar_url || null,
        },
        lastMessage: {
          body: typeof last.body === 'string' ? last.body : '',
          createdAt: last.created_at,
          senderId: last.sender_id,
        },
        unreadCount,
        accepted: mutual || iHaveReplied,
      }
    })
  )
}

async function loadConversations(
  uid: string,
  partnerLimit: number,
): Promise<{ conversations: Conversation[]; hasMore: boolean }> {
  let offset = 0
  let allMsgs: RawMessage[] = []
  let moreMessages = true

  while (moreMessages) {
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, body, read_at, created_at')
      .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + MESSAGE_FETCH_BATCH - 1)

    if (error) {
      console.error('Failed to load messages:', error)
      break
    }
    const batch = (data || []) as RawMessage[]
    if (batch.length === 0) {
      moreMessages = false
      break
    }
    allMsgs = allMsgs.concat(batch)
    offset += batch.length
    if (partnerCountFromMessages(allMsgs, uid) >= partnerLimit) break
    if (batch.length < MESSAGE_FETCH_BATCH) moreMessages = false
  }

  const built = await buildConversationsFromMessages(allMsgs, uid)
  const conversations = built.slice(0, partnerLimit)
  const hasMore =
    built.length > partnerLimit
    || (moreMessages && conversations.length >= partnerLimit)
  return { conversations, hasMore }
}

/**
 * Owns the single app-global Realtime subscription for DM list + unread.
 * Mount once in the root layout (mirrors NotificationsProvider). Badge,
 * inbox, and thread send paths all read/write this store so previews and
 * counts stay in sync without remounts.
 *
 * Effect deps use `userId` (stable primitive), not the `user` object —
 * see useUnreadMessagesCount.ts for the channel teardown race that
 * produced "cannot add postgres_changes callbacks after subscribe()".
 */
export function MessagingProvider({ children }: { children: ReactNode }) {
  // Parallel with Identity ensureProfile — needs JWT only, not profile row.
  const { user: authUser, loading: authLoading } = useAuthGate()
  const userId =
    !authLoading && authUser && !authUser.is_anonymous ? authUser.id : undefined
  const signedOut = !authLoading && (!authUser || !!authUser.is_anonymous)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [partnerLimit, setPartnerLimit] = useState(CONVERSATIONS_PAGE_SIZE)
  const partnerLimitRef = useRef(partnerLimit)
  partnerLimitRef.current = partnerLimit
  const [hasMoreConversations, setHasMoreConversations] = useState(false)
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false)

  const unreadCount = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  )

  const inbox = useMemo(() => conversations.filter(c => c.accepted), [conversations])
  const requests = useMemo(() => conversations.filter(c => !c.accepted), [conversations])

  const applyOutboundMessage = useCallback(
    (args: {
      otherUser: ConversationPartner
      body: string
      createdAt: string
      senderId: string
    }) => {
      const lastMessage = {
        body: args.body,
        createdAt: args.createdAt,
        senderId: args.senderId,
      }
      setConversations(prev => {
        const existing = prev.find(c => c.otherUser.id === args.otherUser.id)
        if (existing) {
          return sortByLastMessage([
            {
              ...existing,
              lastMessage,
              // Sending is a reply — Requests → Inbox (same rule as load).
              accepted: true,
            },
            ...prev.filter(c => c.otherUser.id !== args.otherUser.id),
          ])
        }
        return sortByLastMessage([
          {
            otherUser: args.otherUser,
            lastMessage,
            unreadCount: 0,
            accepted: true,
          },
          ...prev,
        ])
      })
    },
    []
  )

  const clearUnreadForPartner = useCallback((partnerId: string) => {
    setConversations(prev =>
      prev.map(c =>
        c.otherUser.id === partnerId && c.unreadCount > 0
          ? { ...c, unreadCount: 0 }
          : c
      )
    )
  }, [])

  const refetch = useCallback(async () => {
    if (!userId) return
    const limit = partnerLimitRef.current
    const { conversations: list, hasMore } = await loadConversations(userId, limit)
    setConversations(list)
    setHasMoreConversations(hasMore)
    setLoading(false)
    setLoadingMoreConversations(false)
  }, [userId])

  const loadMoreConversations = useCallback(() => {
    if (loadingMoreConversations) return
    setLoadingMoreConversations(true)
    setPartnerLimit((n) => n + CONVERSATIONS_PAGE_SIZE)
  }, [loadingMoreConversations])

  useForegroundCatchup(refetch, !!userId)

  useEffect(() => {
    if (authLoading) return

    if (signedOut || !userId) {
      setConversations([])
      setPartnerLimit(CONVERSATIONS_PAGE_SIZE)
      setHasMoreConversations(false)
      setLoading(false)
      return
    }

    let active = true

    setLoading(true)
    void refetch()

    // One channel topic per user — both filters registered before subscribe.
    const channel = supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` },
        () => { if (active) void refetch() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` },
        () => { if (active) void refetch() }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [authLoading, signedOut, userId, refetch])

  useEffect(() => {
    if (!userId || authLoading || signedOut) return
    if (partnerLimit <= CONVERSATIONS_PAGE_SIZE) return
    setLoadingMoreConversations(true)
    void refetch()
  }, [partnerLimit, userId, authLoading, signedOut, refetch])

  const value = useMemo<MessagingContextValue>(
    () => ({
      conversations,
      inbox,
      requests,
      unreadCount,
      loading,
      loadingMoreConversations,
      hasMoreConversations,
      loadMoreConversations,
      refetch,
      applyOutboundMessage,
      clearUnreadForPartner,
    }),
    [
      conversations,
      inbox,
      requests,
      unreadCount,
      loading,
      loadingMoreConversations,
      hasMoreConversations,
      loadMoreConversations,
      refetch,
      applyOutboundMessage,
      clearUnreadForPartner,
    ]
  )

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  )
}

export function useMessaging() {
  const ctx = useContext(MessagingContext)
  if (!ctx) {
    throw new Error('useMessaging must be used within MessagingProvider')
  }
  return ctx
}
