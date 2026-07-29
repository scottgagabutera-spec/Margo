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
 */
export function useThread(otherUsername: string) {
  const { user } = useIdentity()
  const [partner, setPartner] = useState<ThreadPartner | null>(null)
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [canSend, setCanSend] = useState(true)
  const [sending, setSending] = useState(false)

  const loadThread = useCallback(async (userId: string, other: ThreadPartner) => {
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, body, read_at, created_at')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${userId})`)
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
    if (!user || !otherUsername) {
      setLoading(false)
      return
    }
    const userId = user.id
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
          .eq('followee_id', userId)
          .maybeSingle()
        if (active) setCanSend(f?.status === 'accepted')
      } else {
        setCanSend(true)
      }

      await loadThread(userId, other)
      if (!active) return

      channel = supabase
        .channel(`thread:${userId}:${other.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const m: any = payload.new
          const belongsHere =
            (m.sender_id === userId && m.recipient_id === other.id) ||
            (m.sender_id === other.id && m.recipient_id === userId)
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
  }, [user, otherUsername, loadThread])

  const sendMessage = useCallback(async (body: string) => {
    if (!user || !partner || !body.trim()) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: partner.id,
      body: body.trim(),
    })
    setSending(false)
    if (error) console.error('Failed to send message:', error)
  }, [user, partner])

  return { partner, messages, loading, canSend, sending, sendMessage }
}