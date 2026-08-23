'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthGate } from '@/components/supabase-auth-provider'

const supabase = createClient()

/**
 * Song-level resonate (song_resonates → song_stats.resonate_count).
 * Auth required; matches feed post_resonates pattern.
 */
export function useSongResonate(songId: string | null, baseCount = 0) {
  const { user, requireAuth } = useAuthGate()
  const [resonated, setResonated] = useState(false)
  const [countDelta, setCountDelta] = useState(0)

  useEffect(() => {
    setCountDelta(0)
    if (!songId || !user?.id) {
      setResonated(false)
      return
    }

    let cancelled = false
    void supabase
      .from('song_resonates')
      .select('song_id')
      .eq('song_id', songId)
      .eq('actor_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('useSongResonate: failed to load', error)
          setResonated(false)
          return
        }
        setResonated(!!data)
      })

    return () => { cancelled = true }
  }, [songId, user?.id])

  const displayCount = Math.max(0, (baseCount || 0) + countDelta)

  const toggleResonate = useCallback(async (): Promise<boolean> => {
    if (!songId || !requireAuth()) return false
    const uid = user?.id
    if (!uid) return false

    const was = resonated
    setResonated(!was)
    setCountDelta(d => d + (was ? -1 : 1))

    if (was) {
      const { error } = await supabase
        .from('song_resonates')
        .delete()
        .eq('song_id', songId)
        .eq('actor_id', uid)
      if (error) {
        console.error('useSongResonate: delete failed', error)
        setResonated(was)
        setCountDelta(d => d + 1)
        return false
      }
    } else {
      const { error } = await supabase
        .from('song_resonates')
        .insert({ song_id: songId, actor_id: uid })
      if (error) {
        console.error('useSongResonate: insert failed', error)
        setResonated(was)
        setCountDelta(d => d - 1)
        return false
      }
    }
    return true
  }, [songId, user?.id, resonated, requireAuth])

  return { resonated, displayCount, toggleResonate }
}
