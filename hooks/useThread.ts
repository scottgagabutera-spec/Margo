'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { useMessaging } from '@/hooks/useMessaging'
import { isPartnerUuid } from '@/lib/messages/partner-key'

const supabase = createClient()

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
 * canSend here is a client-side UX signal only (disables the Send
 * button early) — the real enforcement is the can_message() function
 * inside the messages table's RLS insert policy, so a direct API call
 * can't bypass this setting even if this client-side check were wrong
 * or skipped.
 *
 * "followers" means the SENDER must follow the RECIPIENT — checking
 * follower_id = sender, followee_id = recipient. An earlier version
 * of this had the two swapped, which checked the reverse relationship
 * and could both wrongly allow and wrongly block real cases.
 *
 * The realtime effect depends on `userId` (a stable primitive), not
 * the `user` object itself — see MessagingProvider for the shared
 * inbox/badge channel; this hook only opens a page-scoped thread channel.
 *
 * On successful send / mark-read, updates MessagingProvider locally so
 * the inbox preview and nav badge stay in sync without a remount.
 */
export function useThread(partnerKey: string) {
  const { user } = useIdentity()
  const userId = user?.id
  const { applyOutboundMessage, clearUnreadForPartner } = useMessaging()
  const [partner, setPartner] = useState<ThreadPartner | null>(null)
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
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
      // Optimistic badge/inbox clear; Realtime reload on MessagingProvider confirms.
      clearUnreadForPartner(other.id)
      await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
    }
  }, [clearUnreadForPartner])

  useEffect(() => {
    if (!userId || !partnerKey) {
      setLoading(false)
      return
    }

    const uid = userId

    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function run() {
      setLoading(true)
      setLoadError(null)
      const timeoutMs = 15_000
      let timedOut = false
      const watchdog = setTimeout(() => {
        timedOut = true
        setLoading(false)
        setLoadError('This conversation is taking too long to load.')
      }, timeoutMs)
      try {
        const profileQuery = isPartnerUuid(partnerKey)
          ? supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url, who_can_message')
              .eq('id', partnerKey)
              .maybeSingle()
          : supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url, who_can_message')
              .eq('username', partnerKey)
              .maybeSingle()

        const { data: profile, error } = await profileQuery

        // Cancelled / timed-out mount — do not keep applying results.
        if (!active || timedOut) return
        if (error || !profile) {
          setLoadError('Could not open this conversation.')
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
            .eq('follower_id', uid)
            .eq('followee_id', other.id)
            .maybeSingle()
          if (active && !timedOut) setCanSend(f?.status === 'accepted')
        } else {
          setCanSend(true)
        }

        await loadThread(uid, other)
        if (!active || timedOut) return

        // Unique topic per mount — shared `thread:uid:other` races under
        // Strict Mode / fast remount the same way Feed Realtime topics did.
        const topic =
          'thread:' + uid + ':' + other.id + ':' + Math.random().toString(36).slice(2, 10)
        try {
          channel = supabase
            .channel(topic)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
              const m: any = payload.new
              const belongsHere =
                (m.sender_id === uid && m.recipient_id === other.id) ||
                (m.sender_id === other.id && m.recipient_id === uid)
              if (!belongsHere) return
              setMessages(prev => {
                if (prev.some(existing => existing.id === m.id)) return prev
                return [...prev, { id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at, readAt: m.read_at }]
              })
              if (m.sender_id === other.id) {
                clearUnreadForPartner(other.id)
                supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', m.id)
              }
            })
            .subscribe()
        } catch (err) {
          console.error('useThread: realtime subscribe failed', err)
        }
      } catch (err) {
        console.error('useThread: load failed', err)
      } finally {
        clearTimeout(watchdog)
        // Always clear — cancelled mounts / hangs otherwise leave a near-black spinner.
        setLoading(false)
      }
    }

    run()

    return () => {
      active = false
      if (channel) void supabase.removeChannel(channel)
    }
  }, [userId, partnerKey, loadThread, clearUnreadForPartner])

  const sendMessage = useCallback(async (body: string) => {
    if (!userId || !partner || !body.trim()) return
    setSending(true)
    const trimmed = body.trim()
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        recipient_id: partner.id,
        body: trimmed,
      })
      .select('id, sender_id, body, read_at, created_at')
      .single()
    setSending(false)
    if (error) {
      console.error('Failed to send message:', error)
      return
    }
    if (!data) return

    setMessages(prev => {
      if (prev.some(m => m.id === data.id)) return prev
      return [...prev, {
        id: data.id,
        senderId: data.sender_id,
        body: data.body,
        createdAt: data.created_at,
        readAt: data.read_at,
      }]
    })

    applyOutboundMessage({
      otherUser: {
        id: partner.id,
        username: partner.username,
        displayName: partner.displayName,
        avatarUrl: partner.avatarUrl,
      },
      body: data.body,
      createdAt: data.created_at,
      senderId: data.sender_id,
    })
  }, [userId, partner, applyOutboundMessage])

  return { partner, messages, loading, loadError, canSend, sending, sendMessage }
}
