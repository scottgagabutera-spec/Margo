'use client'
import { useState, useEffect, useCallback } from 'react'
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

/**
 * Fetches a person's notifications (messages, resonates, follows) and
 * keeps them live via a Supabase Realtime subscription — new rows
 * (written by the DB triggers in add_notifications.sql, or inserted
 * directly from the client for resonates) appear immediately without
 * a page refresh.
 */
export function useNotifications() {
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

    // Captured as its own const right after the null check — TS narrows
    // `user` inside this effect body, but that narrowing doesn't survive
    // into the nested `loadInitial` function or the realtime callback
    // below, since they're separate function scopes. `userId` is a plain
    // string, so no narrowing issue there.
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

    // Realtime subscription — fires whenever a new notification row is
    // inserted for this user. Runs a small follow-up fetch for just
    // that one row (rather than trusting the raw realtime payload
    // directly) so the actor's profile data is joined in consistently.
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

    // Optimistic — update locally first so the badge clears instantly.
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

  return { notifications, unreadCount, loading, markAllRead }
}