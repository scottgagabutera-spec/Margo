'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthGate } from '@/components/supabase-auth-provider'

// Cookie-session client (Phase 4 bridge). Reads/writes notifications under
// RLS require the JWT from the auth cookie — the old localStorage client 401s.
const supabase = createClient()

export type NotificationType =
  | 'message' | 'resonate' | 'follow' | 'follow_request'
  | 'lyric_back'
  | 'warned' | 'frozen' | 'removed' | 'restored'
  | 'artist_approved' | 'artist_rejected'

export interface Notification {
  id: string
  recipientId: string
  actorId: string | null
  type: NotificationType
  postId: string | null
  messageId: string | null
  createdAt: string
  readAt: string | null
  actor: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  } | null
}

type ActorIdentity = NonNullable<Notification['actor']>

interface NotificationRow {
  id: string
  recipient_id: string
  actor_id: string | null
  type: NotificationType
  post_id: string | null
  message_id: string | null
  created_at: string
  read_at: string | null
}

const SELECT_COLUMNS =
  'id, recipient_id, actor_id, type, post_id, message_id, created_at, read_at'

/**
 * Profiles RLS blocks embedding many actors on notification rows (private
 * accounts the recipient does not yet follow). Hydrate identity via
 * profiles_for_my_notification_actors — security definer, scoped to actors
 * that appear on the caller's own notifications only.
 */
async function loadActorMap(actorIds: string[]): Promise<Map<string, ActorIdentity>> {
  const unique = [...new Set(actorIds.filter(Boolean))]
  const map = new Map<string, ActorIdentity>()
  if (unique.length === 0) return map

  const { data, error } = await supabase.rpc('profiles_for_my_notification_actors', {
    p_actor_ids: unique,
  })
  if (error) {
    console.error('Failed to load notification actors:', error)
    return map
  }
  for (const row of data || []) {
    map.set(row.id, {
      id: row.id,
      username: row.username,
      displayName: row.display_name || row.username,
      avatarUrl: row.avatar_url,
    })
  }
  return map
}

function mapRow(row: NotificationRow, actors: Map<string, ActorIdentity>): Notification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    actorId: row.actor_id,
    type: row.type,
    postId: row.post_id,
    messageId: row.message_id,
    createdAt: row.created_at,
    readAt: row.read_at,
    actor: row.actor_id ? actors.get(row.actor_id) ?? null : null,
  }
}

async function fetchNotificationsMapped(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(SELECT_COLUMNS)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  const rows = (data || []) as NotificationRow[]
  const actors = await loadActorMap(rows.map((r) => r.actor_id).filter(Boolean) as string[])
  return rows.map((r) => mapRow(r, actors))
}

async function fetchOneNotificationMapped(id: string): Promise<Notification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('Failed to load notification:', error)
    return null
  }
  const row = data as NotificationRow
  const actors = await loadActorMap(row.actor_id ? [row.actor_id] : [])
  return mapRow(row, actors)
}

interface NotificationsContextValue {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAllRead: () => Promise<void>
  acceptFollowRequest: (notification: Notification) => Promise<void>
  declineFollowRequest: (notification: Notification) => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

/**
 * Owns the single Realtime subscription for a signed-in user's
 * notifications. This must be mounted exactly once (in the root
 * layout) — HubMenu (desktop + mobile) and any remaining consumers
 * read from it via useNotifications() below instead of each opening
 * their own subscription. Two components independently subscribing to
 * the same `notifications:${userId}` channel topic previously caused the
 * "cannot add postgres_changes callbacks after subscribe()" crash when
 * desktop nav and mobile tab bar both mounted NotificationBell-style
 * listeners — keep a single provider.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  // Auth gate (not Identity): start the list fetch as soon as JWT is ready,
  // in parallel with ensureProfile — profile row is not required for RLS here.
  const { user: authUser, loading: authLoading } = useAuthGate()
  const userId =
    !authLoading && authUser && !authUser.is_anonymous ? authUser.id : undefined
  const signedOut = !authLoading && (!authUser || !!authUser.is_anonymous)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const unreadCount = notifications.filter(n => !n.readAt).length

  useEffect(() => {
    if (authLoading) return

    if (signedOut || !userId) {
      setNotifications([])
      setLoading(false)
      return
    }

    let active = true

    async function loadInitial() {
      try {
        const mapped = await fetchNotificationsMapped(userId!)
        if (!active) return
        setNotifications(mapped)
      } catch (error) {
        console.error('Failed to load notifications:', error)
      } finally {
        if (active) setLoading(false)
      }
    }

    setLoading(true)
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
          const mapped = await fetchOneNotificationMapped(payload.new.id)
          if (mapped && active) {
            setNotifications(prev => [mapped, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [authLoading, signedOut, userId])

  const markAllRead = useCallback(async () => {
    if (!userId) return
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
  }, [userId, notifications])

  // Accepting flips the pending follows row to accepted — this also
  // fires the existing notify_on_follow trigger, which inserts a
  // separate 'follow' notification for the same recipient ("X started
  // following you"), arriving via the realtime INSERT listener above.
  // The follow_request notification itself is deleted since it's now
  // resolved, not left around as a stale action item.
  const acceptFollowRequest = useCallback(async (n: Notification) => {
    if (!userId || !n.actorId) return
    const { error: followErr } = await supabase
      .from('follows')
      .update({ status: 'accepted' })
      .eq('follower_id', n.actorId)
      .eq('followee_id', userId)
      .eq('status', 'pending')
    if (followErr) {
      console.error('Failed to accept follow request:', followErr)
      return
    }
    await supabase.from('notifications').delete().eq('id', n.id)
    setNotifications(prev => prev.filter(x => x.id !== n.id))
  }, [userId])

  const declineFollowRequest = useCallback(async (n: Notification) => {
    if (!userId || !n.actorId) return
    const { error: followErr } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', n.actorId)
      .eq('followee_id', userId)
      .eq('status', 'pending')
    if (followErr) {
      console.error('Failed to decline follow request:', followErr)
      return
    }
    await supabase.from('notifications').delete().eq('id', n.id)
    setNotifications(prev => prev.filter(x => x.id !== n.id))
  }, [userId])

  return (
    <NotificationsContext.Provider value={{
      notifications, unreadCount, loading, markAllRead,
      acceptFollowRequest, declineFollowRequest,
    }}>
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
