'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/hooks/useIdentity'

export function useUnreadMessagesCount() {
  const { user } = useIdentity()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) {
      setCount(0)
      return
    }
    const userId = user.id
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
  }, [user])

  return count
}