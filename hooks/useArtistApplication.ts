'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/hooks/useIdentity'

export interface ArtistApplicationLinks {
  spotify?: string
  youtube?: string
  soundcloud?: string
  instagram?: string
  tiktok?: string
  other?: string
}

export interface ArtistApplication {
  status: 'none' | 'pending' | 'approved' | 'rejected'
  displayArtistName: string
  links: ArtistApplicationLinks
  note?: string
}

interface ActionResult {
  success: boolean
  error?: string
}

/**
 * Reads/writes the Supabase `artist_applications` table. Separate from
 * useIdentity/profiles by design — artist status is a reviewable
 * application with its own history, not a profile field.
 */
export function useArtistApplication() {
  const { user } = useIdentity()
  const [application, setApplication] = useState<ArtistApplication | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setApplication(null)
      setLoading(false)
      return
    }
    let active = true
    supabase
      .from('artist_applications')
      .select('*')
      .eq('profile_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setApplication(
          data
            ? {
                status: data.status,
                displayArtistName: data.display_artist_name,
                links: data.links,
                note: data.note ?? undefined,
              }
            : null
        )
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  const submitArtistApplication = useCallback(
    async (data: {
      displayArtistName: string
      links: ArtistApplicationLinks
      note?: string
      rightsAgreed: boolean
    }): Promise<ActionResult> => {
      if (!user) return { success: false, error: 'Not signed in.' }

      const name = data.displayArtistName.trim()
      if (!name) return { success: false, error: 'Artist name is required.' }

      const hasLink = Object.values(data.links).some(v => v && v.trim().length > 0)
      if (!hasLink) return { success: false, error: 'Add at least one link so we can verify you.' }

      if (!data.rightsAgreed) {
        return { success: false, error: 'You must agree to the rights warranty to continue.' }
      }

      const cleanedLinks: ArtistApplicationLinks = {}
      for (const [key, value] of Object.entries(data.links)) {
        if (value && value.trim()) cleanedLinks[key as keyof ArtistApplicationLinks] = value.trim()
      }

      const { error } = await supabase.from('artist_applications').insert({
        profile_id: user.id,
        display_artist_name: name,
        links: cleanedLinks,
        note: data.note?.trim() || null,
        rights_agreed: true,
      })

      if (error) return { success: false, error: 'Could not submit application.' }

      setApplication({
        status: 'pending',
        displayArtistName: name,
        links: cleanedLinks,
        note: data.note?.trim() || undefined,
      })
      return { success: true }
    },
    [user]
  )

  return { application, loading, submitArtistApplication }
}