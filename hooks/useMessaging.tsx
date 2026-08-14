'use client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

interface MessagingContextValue {
  conversations: Conversation[]
  inbox: Conversation[]
  requests: Conversation[]
  unreadCount: number
  loading: boolean
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

async function loadConversations(uid: string): Promise<Conversation[]> {
  const { data: msgs, error } = await supabase
    .from('messages')
    .select('id, sender_id, recipient_id, body, read_at, created_at')
    .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
    .order('created_at', { ascending: false })

  if (error || !msgs) {
    console.error('Failed to load messages:', error)
    return []
  }

  const byOther = new Map<string, RawMessage[]>()
  for (const m of msgs as RawMessage[]) {
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
        lastMessage: { body: last.body, createdAt: last.created_at, senderId: last.sender_id },
        unreadCount,
        accepted: mutual || iHaveReplied,
      }
    })
  )
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
    const list = await loadConversations(userId)
    setConversations(list)
    setLoading(false)
  }, [userId])

  useForegroundCatchup(refetch, !!userId)

  useEffect(() => {
    if (authLoading) return

    if (signedOut || !userId) {
      setConversations([])
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

  const value = useMemo<MessagingContextValue>(
    () => ({
      conversations,
      inbox,
      requests,
      unreadCount,
      loading,
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
