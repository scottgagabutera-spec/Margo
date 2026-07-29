'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/hooks/useIdentity'

export interface ThreadMessage {
  id: string
  senderId: string
  body: string
  createdAt: string
  readAt: string | null
}

export interface ThreadPartner {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  whoCanMessage: string
}

/**
 * Loads and live-syncs the message history between the signed-in user
 * and `otherUsername`, and determines send permission from the other
 * person's `who_can_message` setting (everyone / followers / no_one).
 *
 * The realtime effect depends on `userId` (a stable primitive), not
 * the `user` object itself — see useUnreadMessagesCount.ts for the
 * full explanation of why depending on the object reference caused
 * Realtime channel teardown/rebuild races elsewhere in the app.
 */
export function useThread(otherUsername: string) {
  const { user } = useIdentity()
  const userId = user?.id
  const [partner, setPartner] = useState<ThreadPartner | null>(null)
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [canSend, setCanSend] = useState(true)
  const [sending, setSending] = useState(false)

  const loadThread = useCallback(async (uid: string, other: ThreadPartner) => {
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, body, read_at, created_at')
      .or(`and(sender_id.eq.${uid},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${uid})`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load thread:', error)
      setLoading(false)
      return
    }
    setMessages((data || []).map(m => ({ id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at, readAt: m.read_at })))
    setLoading(false)

    const unreadIds = (data || []).filter(m => m.sender_id === other.id && !m.read_at).map(m => m.id)
    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
    }
  }, [])

  useEffect(() => {
    if (!userId || !otherUsername) {
      setLoading(false)
      return
    }

    // Captured as its own const right after the null check — TS narrows
    // `userId` inside this effect body, but that narrowing doesn't
    // survive into the nested `run` function below, since it's a
    // separate function scope. `uid` is a plain string, so no
    // narrowing issue there.
    const uid = userId

    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function run() {
      setLoading(true)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, who_can_message')
        .eq('username', otherUsername)
        .maybeSingle()

      if (!active) return
      if (error || !profile) {
        setLoading(false)
        return
      }

      const other: ThreadPartner = {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        whoCanMessage: profile.who_can_message,
      }
      setPartner(other)

      if (other.whoCanMessage === 'no_one') {
        setCanSend(false)
      } else if (other.whoCanMessage === 'followers') {
        const { data: f } = await supabase
          .from('follows')
          .select('status')
          .eq('follower_id', other.id)
          .eq('followee_id', uid)
          .maybeSingle()
        if (active) setCanSend(f?.status === 'accepted')
      } else {
        setCanSend(true)
      }

      await loadThread(uid, other)
      if (!active) return

      channel = supabase
        .channel(`thread:${uid}:${other.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const m: any = payload.new
          const belongsHere =
            (m.sender_id === uid && m.recipient_id === other.id) ||
            (m.sender_id === other.id && m.recipient_id === uid)
          if (!belongsHere) return
          setMessages(prev => [...prev, { id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at, readAt: m.read_at }])
          if (m.sender_id === other.id) {
            supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', m.id)
          }
        })
        .subscribe()
    }

    run()

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, otherUsername, loadThread])

  const sendMessage = useCallback(async (body: string) => {
    if (!userId || !partner || !body.trim()) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      sender_id: userId,
      recipient_id: partner.id,
      body: body.trim(),
    })
    setSending(false)
    if (error) console.error('Failed to send message:', error)
  }, [userId, partner])

  return { partner, messages, loading, canSend, sending, sendMessage }
}