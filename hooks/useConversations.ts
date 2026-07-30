'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/hooks/useIdentity'

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

/**
 * Builds the conversation list (Inbox + Requests) from the flat
 * `messages` table — there's no conversation_id, so a "conversation"
 * is just the unordered pair of two user ids, grouped client-side.
 *
 * The realtime effect depends on `userId` (a stable primitive), not
 * the `user` object itself — useIdentity() can return a new object
 * reference on every render, and depending on the object directly
 * caused a Realtime channel teardown/rebuild race on fast re-renders
 * (see useUnreadMessagesCount.ts for the full explanation of this
 * failure mode — it produced "cannot add postgres_changes callbacks
 * after subscribe()" crashes elsewhere in the app).
 */
export function useConversations() {
  const { user } = useIdentity()
  const userId = user?.id
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (uid: string) => {
    const { data: msgs, error } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, body, read_at, created_at')
      .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
      .order('created_at', { ascending: false })

    if (error || !msgs) {
      console.error('Failed to load messages:', error)
      setLoading(false)
      return
    }

    const byOther = new Map<string, RawMessage[]>()
    for (const m of msgs as RawMessage[]) {
      const otherId = m.sender_id === uid ? m.recipient_id : m.sender_id
      const list = byOther.get(otherId) || []
      list.push(m)
      byOther.set(otherId, list)
    }

    const otherIds = [...byOther.keys()]
    if (otherIds.length === 0) {
      setConversations([])
      setLoading(false)
      return
    }

    const [{ data: profiles }, { data: followsOut }, { data: followsIn }] = await Promise.all([
      supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', otherIds),
      supabase.from('follows').select('followee_id, status').eq('follower_id', uid).in('followee_id', otherIds),
      supabase.from('follows').select('follower_id, status').eq('followee_id', uid).in('follower_id', otherIds),
    ])

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))
    const iFollow = new Set((followsOut || []).filter(f => f.status === 'accepted').map(f => f.followee_id))
    const followsMe = new Set((followsIn || []).filter(f => f.status === 'accepted').map(f => f.follower_id))

    const list: Conversation[] = otherIds.map(otherId => {
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
    }).sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime())

    setConversations(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!userId) {
      setConversations([])
      setLoading(false)
      return
    }
    let active = true
    load(userId)

    const channel = supabase
      .channel(`conversations:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` }, () => { if (active) load(userId) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` }, () => { if (active) load(userId) })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [userId, load])

  const inbox = conversations.filter(c => c.accepted)
  const requests = conversations.filter(c => !c.accepted)

  return { inbox, requests, loading }
}