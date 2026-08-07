'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'

const supabase = createClient()

export type ApplicantType = 'independent' | 'label'

export interface ArtistApplicationLinks {
  spotify?: string
  appleMusic?: string
  youtube?: string
  soundcloud?: string
  boomplay?: string
  audiomack?: string
  deezer?: string
  instagram?: string
  tiktok?: string
  suno?: string
  other?: string
}

export interface ArtistApplication {
  status: 'none' | 'pending' | 'approved' | 'rejected'
  applicantType: ApplicantType
  displayArtistName: string
  links: ArtistApplicationLinks
  note?: string
  verificationMethod?: 'suno' | 'manual' | null
  verifiedAt?: string | null
}

interface ActionResult {
  success: boolean
  error?: string
}

interface SubmitInput {
  applicantType: ApplicantType
  displayArtistName: string
  links: ArtistApplicationLinks
  note?: string
  rightsAgreed: boolean
  sunoVerification: { code: string } | null
}

// Best-effort hostname → Margo link-field mapping for links imported from
// a Linktree page. Matches on the destination URL's hostname rather than
// Linktree's own internal `type` field, since that taxonomy isn't
// confirmed — hostname matching is more robust regardless of how
// Linktree labels a link internally.
const HOST_FIELD_MAP: { pattern: RegExp; field: keyof ArtistApplicationLinks }[] = [
  { pattern: /open\.spotify\.com$/, field: 'spotify' },
  { pattern: /music\.apple\.com$/, field: 'appleMusic' },
  { pattern: /(youtube\.com|youtu\.be)$/, field: 'youtube' },
  { pattern: /soundcloud\.com$/, field: 'soundcloud' },
  { pattern: /boomplay\.com$/, field: 'boomplay' },
  { pattern: /audiomack\.com$/, field: 'audiomack' },
  { pattern: /deezer\.com$/, field: 'deezer' },
  { pattern: /instagram\.com$/, field: 'instagram' },
  { pattern: /tiktok\.com$/, field: 'tiktok' },
  { pattern: /suno\.com$/, field: 'suno' },
]

export function mapImportedLinksToFields(rawLinks: { url: string }[]): Partial<ArtistApplicationLinks> {
  const result: Partial<ArtistApplicationLinks> = {}
  for (const link of rawLinks) {
    let hostname = ''
    try {
      hostname = new URL(link.url).hostname.replace(/^www\./, '')
    } catch {
      continue
    }
    const match = HOST_FIELD_MAP.find(m => m.pattern.test(hostname))
    if (match && !result[match.field]) {
      result[match.field] = link.url
    } else if (!match && !result.other) {
      result.other = link.url
    }
  }
  return result
}

export function generateVerificationCode(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `MARGO-${random.toUpperCase()}`
}

/**
 * Reads/writes the Supabase `artist_applications` table. Separate from
 * useIdentity/profiles by design — artist status is a reviewable
 * application with its own history, not a profile field.
 *
 * Verification (Suno bio-code, independent applicants only) and the
 * actual submission both go through server routes
 * (`/api/verify-artist-link`, `/api/submit-artist-application`) rather
 * than writing directly from the browser — the server independently
 * re-checks the Suno code before ever approving anything, so the
 * approval decision can't be spoofed from the client.
 *
 * On instant approve, the server flips profiles.is_artist = true via
 * a DB trigger — but useIdentity()'s `identity` state has no listener
 * on that table, so it won't know unless told. After a successful
 * approved submission, this calls refreshIdentity() so identity.isArtist
 * reflects reality immediately, without requiring a reload or a
 * sign-out/sign-in cycle.
 */
export function useArtistApplication() {
  const { user, refreshIdentity } = useIdentity()
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
                applicantType: data.applicant_type ?? 'independent',
                displayArtistName: data.display_artist_name,
                links: data.links,
                note: data.note ?? undefined,
                verificationMethod: data.verification_method ?? null,
                verifiedAt: data.verified_at ?? null,
              }
            : null
        )
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  const verifySunoLink = useCallback(async (sunoUrl: string, code: string): Promise<ActionResult> => {
    try {
      const res = await fetch('/api/verify-artist-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sunoUrl, code }),
      })
      const data = await res.json()
      if (!res.ok || !data.verified) {
        return { success: false, error: data.error || "Couldn't find that code on your Suno profile yet." }
      }
      return { success: true }
    } catch {
      return { success: false, error: 'Could not reach the verification service. Try again.' }
    }
  }, [])

  const importLinktree = useCallback(
    async (linktreeUrl: string): Promise<{ success: boolean; links?: Partial<ArtistApplicationLinks>; error?: string }> => {
      try {
        const res = await fetch('/api/import-linktree', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: linktreeUrl }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'Could not import that Linktree page.' }
        }
        return { success: true, links: mapImportedLinksToFields(data.links) }
      } catch {
        return { success: false, error: 'Could not reach the import service. Try again.' }
      }
    },
    []
  )

  const submitArtistApplication = useCallback(
    async (data: SubmitInput): Promise<ActionResult> => {
      if (!user) return { success: false, error: 'Not signed in.' }

      const name = data.displayArtistName.trim()
      if (!name) return { success: false, error: 'Artist name is required.' }

      const hasLink = Object.values(data.links).some(v => v && v.trim().length > 0)
      if (!hasLink) return { success: false, error: 'Add at least one link so we can verify you.' }

      if (!data.rightsAgreed) {
        return { success: false, error: 'You must agree to the rights warranty to continue.' }
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) return { success: false, error: 'Not signed in.' }

      try {
        const res = await fetch('/api/submit-artist-application', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            applicantType: data.applicantType,
            displayArtistName: name,
            links: data.links,
            note: data.note,
            rightsAgreed: data.rightsAgreed,
            sunoVerification: data.sunoVerification,
          }),
        })
        const result = await res.json()
        if (!res.ok || !result.success) {
          return { success: false, error: result.error || 'Could not submit application.' }
        }

        setApplication({
          status: result.status,
          applicantType: data.applicantType,
          displayArtistName: name,
          links: data.links,
          note: data.note?.trim() || undefined,
          verificationMethod: result.status === 'approved' ? 'suno' : null,
          verifiedAt: result.verifiedAt ?? null,
        })

        // Server-side trigger already flipped profiles.is_artist = true
        // on approval — pull it into identity state now so the UI
        // reflects it immediately instead of on next sign-in.
        if (result.status === 'approved') {
          await refreshIdentity()
        }

        return { success: true }
      } catch {
        return { success: false, error: 'Could not reach the server. Try again.' }
      }
    },
    [user, refreshIdentity]
  )

  return { application, loading, submitArtistApplication, verifySunoLink, importLinktree }
}