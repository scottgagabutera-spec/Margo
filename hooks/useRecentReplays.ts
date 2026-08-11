'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { PRIMARY_TAB_STALE_MS } from '@/hooks/usePosts'
import {
  mapReplayRows,
  REPLAY_FEED_SELECT,
  type FeedReplay,
} from '@/lib/feed-replay-map'

const supabase = createClient()

export type { FeedReplay }

/**
 * Recent Replays from anyone (global discovery), for interleaving into the
 * main Feed with attribution. Originals still come from usePosts; this only
 * injects Replay wrappers. Following-scoped variant: useFolloweeReplays.
 */
export function useRecentReplays(
  limit = 80,
  options: { enabled?: boolean } = {}
) {
  const enabled = options.enabled ?? true
  const { user } = useIdentity()
  const [replays, setReplays] = useState<FeedReplay[]>([])
  const [loading, setLoading] = useState(false)
  const lastLoadedAtRef = useRef(0)

  const load = useCallback(async () => {
    // post_replays SELECT is authenticated; no session → no attributed cards.
    if (!user?.id) {
      setReplays([])
      return
    }
    setLoading(true)

    const { data, error } = await supabase
      .from('post_replays')
      .select(REPLAY_FEED_SELECT)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('useRecentReplays: replays', error)
      setReplays([])
      setLoading(false)
      return
    }

    setReplays(mapReplayRows(data))
    setLoading(false)
    lastLoadedAtRef.current = Date.now()
  }, [user?.id, limit])

  useEffect(() => {
    if (!enabled) return

    const neverLoaded = lastLoadedAtRef.current === 0
    const stale = Date.now() - lastLoadedAtRef.current > PRIMARY_TAB_STALE_MS
    if (neverLoaded || stale) {
      void load()
    }

    if (!user?.id) return
    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      const topic = `recent-replays:${user.id}:${crypto.randomUUID()}`
      channel = supabase
        .channel(topic)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_replays' }, () => { void load() })
        .subscribe()
    } catch (err) {
      console.error('recent-replays realtime failed', err)
    }
    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [enabled, user?.id, load])

  return { replays, loading, reload: load }
}
