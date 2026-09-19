'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseAtmosphere, type AtmosphereId } from '@/lib/atmosphere'

/**
 * Live song atmosphere for platform preview — joined from songs.atmosphere,
 * never from export-only overrides.
 */
export function useSongAtmosphere(songId: string | null | undefined): AtmosphereId {
  const [atmosphere, setAtmosphere] = useState<AtmosphereId>('still')

  useEffect(() => {
    if (!songId) {
      setAtmosphere('still')
      return
    }
    let cancelled = false
    const supabase = createClient()
    void (async () => {
      try {
        const { data } = await supabase
          .from('songs')
          .select('atmosphere')
          .eq('id', songId)
          .maybeSingle()
        if (!cancelled) setAtmosphere(parseAtmosphere(data?.atmosphere))
      } catch {
        if (!cancelled) setAtmosphere('still')
      }
    })()
    return () => { cancelled = true }
  }, [songId])

  return atmosphere
}
