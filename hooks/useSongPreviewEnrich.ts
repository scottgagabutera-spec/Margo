'use client'

import { useEffect, useState } from 'react'
import { fetchSongPreviewEnrich, type SongPreviewEnrich } from '@/lib/song-preview-enrich'

export function useSongPreviewEnrich(songId: string | null) {
  const [enrich, setEnrich] = useState<SongPreviewEnrich | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!songId) {
      setEnrich(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void fetchSongPreviewEnrich(songId).then((data) => {
      if (cancelled) return
      setEnrich(data)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [songId])

  return { enrich, loading }
}
