'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sanitizeArtistLinks } from '@/lib/artist-links'
import type { ArtistApplicationLinks } from '@/lib/artist-music-group'

const supabase = createClient()

export type SongOwnerProfile = {
  username: string
  displayName: string
  bio: string | null
  artistLinks: ArtistApplicationLinks
  avatarUrl: string | null
}

export function useSongOwnerProfile(songId: string | null) {
  const [profile, setProfile] = useState<SongOwnerProfile | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!songId) {
      setProfile(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void supabase
      .from('songs')
      .select('owner_profile_id, profiles!owner_profile_id ( username, display_name, bio, avatar_url, artist_links )')
      .eq('id', songId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setProfile(null)
          setLoading(false)
          return
        }
        const raw = data.profiles as
          | { username: string; display_name: string | null; bio: string | null; avatar_url: string | null; artist_links: Record<string, string> | null }
          | { username: string; display_name: string | null; bio: string | null; avatar_url: string | null; artist_links: Record<string, string> | null }[]
          | null
        const prof = Array.isArray(raw) ? raw[0] : raw
        if (!prof?.username) {
          setProfile(null)
          setLoading(false)
          return
        }
        setProfile({
          username: prof.username,
          displayName: prof.display_name || prof.username,
          bio: prof.bio || null,
          artistLinks: sanitizeArtistLinks(prof.artist_links),
          avatarUrl: prof.avatar_url || null,
        })
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [songId])

  return { profile, loading }
}
