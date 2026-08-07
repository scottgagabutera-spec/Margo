'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

/**
 * Supabase-backed replacement for the old Firebase useLicensedArtists.
 * Same { artists, isLicensed, loading } shape, so the one call site
 * (app/compose/page.tsx) only needs its import swapped, nothing else.
 *
 * "Licensed" now means: has an approved row in artist_applications,
 * instead of a hand-maintained Firebase adminConfig string array.
 * Margo's own house name stays hardcoded in so the founder's posts
 * keep full playback even before any real applications exist.
 */
export function useApprovedArtists() {
  const [artists, setArtists] = useState<string[]>(['margo', 'trymargo'])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase
      .from('artist_applications')
      .select('display_artist_name')
      .eq('status', 'approved')
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error('Failed to load approved artists:', error)
          setLoading(false)
          return
        }
        const approved = (data || [])
          .map(row => (row.display_artist_name || '').toLowerCase().trim())
          .filter(Boolean)
        setArtists(['margo', 'trymargo', ...approved])
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  const isLicensed = (artistName: string) => artists.includes(artistName.toLowerCase().trim())

  return { artists, isLicensed, loading }
}