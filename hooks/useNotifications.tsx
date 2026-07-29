'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/hooks/useIdentity'

export type NotificationType = 'message' | 'resonate' | 'follow'

export interface Notification {
  id: string
  recipientId: string
  actorId: string | null
  type: NotificationType
  postId: string | null
  messageId: string | null
  createdAt: string
  readAt: string | null
  // Joined from profiles at read time — who did the thing that triggered
  // this notification. Null only if the actor's account was deleted.
  actor: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  } | null
}

function mapRow(row: any): Notification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    actorId: row.actor_id,
    type: row.type,
    postId: row.post_id,
    messageId: row.message_id,
    createdAt: row.created_at,
    readAt: row.read_at,
    actor: row.actor
      ? {
          id: row.actor.id,
          username: row.actor.username,
          displayName: row.actor.display_name,
          avatarUrl: row.actor.avatar_url,
        }
      : null,
  }
}

const SELECT_WITH_ACTOR = `
  id, recipient_id, actor_id, type, post_id, message_id, created_at, read_at,
  actor:profiles!notifications_actor_id_fkey ( id, username, display_name, avatar_url )
`

interface NotificationsContextValue {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAllRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

/**
 * Owns the single Realtime subscription for a signed-in user's
 * notifications. This must be mounted exactly once (in the root
 * layout) — both NotificationBell (desktop) and MobileTabBar (mobile)
 * read from it via useNotifications() below instead of each opening
 * their own subscription. Two components independently subscribing to
 * the same `notifications:${userId}` channel topic is what caused the
 * "cannot add postgres_changes callbacks after subscribe()" crash,
 * since desktop nav and mobile tab bar are both mounted at once
 * (hidden with CSS per breakpoint, not actually unmounted).
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useIdentity()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const unreadCount = notifications.filter(n => !n.readAt).length

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    const userId = user.id
    let active = true

    async function loadInitial() {
      const { data, error } = await supabase
        .from('notifications')
        .select(SELECT_WITH_ACTOR)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!active) return
      if (error) {
        console.error('Failed to load notifications:', error)
        setLoading(false)
        return
      }
      setNotifications((data || []).map(mapRow))
      setLoading(false)
    }

    loadInitial()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('notifications')
            .select(SELECT_WITH_ACTOR)
            .eq('id', payload.new.id)
            .maybeSingle()
          if (data && active) {
            setNotifications(prev => [mapRow(data), ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [user])

  const markAllRead = useCallback(async () => {
    if (!user) return
    const unreadIds = notifications.filter(n => !n.readAt).map(n => n.id)
    if (unreadIds.length === 0) return

    const now = new Date().toISOString()
    setNotifications(prev =>
      prev.map(n => (n.readAt ? n : { ...n, readAt: now }))
    )

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: now })
      .in('id', unreadIds)

    if (error) console.error('Failed to mark notifications read:', error)
  }, [user, notifications])

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, loading, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  )
}

/**
 * Reads from the shared NotificationsProvider. Throws if used outside
 * it — that's intentional, since a silent fallback would let a future
 * component accidentally open its own duplicate subscription again.
 */
export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider')
  }
  return ctx
}