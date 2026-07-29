'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/hooks/useIdentity'

/**
 * Depends on `user?.id` (a stable primitive) rather than the `user`
 * object itself. useIdentity() can return a new object reference on
 * every render, and this hook is used inside MessagesIcon → MargoNav,
 * which re-renders on every route change (usePathname()). With
 * `[user]` as the dependency, that meant this effect tore down and
 * rebuilt the Realtime channel on every navigation — and since
 * supabase.removeChannel() unsubscribes asynchronously, a fast second
 * navigation could call .subscribe() again before the previous
 * unsubscribe finished, colliding on the same channel name and
 * throwing "cannot add postgres_changes callbacks after subscribe()".
 */
export function useUnreadMessagesCount() {
  const { user } = useIdentity()
  const userId = user?.id
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!userId) {
      setCount(0)
      return
    }

    let active = true

    async function load() {
      const { count: c } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .is('read_at', null)
      if (active) setCount(c || 0)
    }
    load()

    const channel = supabase
      .channel(`unread-messages:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` }, () => { load() })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [userId])

  return count
}