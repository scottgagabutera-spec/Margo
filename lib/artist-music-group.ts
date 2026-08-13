/**
 * Build MusicGroup JSON-LD for a verified public artist profile.
 * Gate: is_artist + badge-visible status + not private + ≥1 major DSP link
 * (Spotify / Apple Music / Boomplay) from the approved application `links` json.
 *
 * Visibility mirrors `shouldShowArtistBadge` in components/artist-badge.tsx
 * (kept local so this module stays server-safe — do not import from 'use client').
 *
 * Follow-up: DSP links live on artist_applications only and are not editable
 * post-approval on the profile — can go stale.
 */

export type ArtistStatus = 'active' | 'warned' | 'frozen' | 'removed' | null | undefined

export type ArtistApplicationLinks = {
  spotify?: string
  appleMusic?: string
  boomplay?: string
  youtube?: string
  soundcloud?: string
  audiomack?: string
  deezer?: string
  instagram?: string
  tiktok?: string
  suno?: string
  other?: string
  [key: string]: string | undefined
}

const MAJOR_DSP_KEYS = ['spotify', 'appleMusic', 'boomplay'] as const

/** Prefer major DSPs first, then other known platforms (still only after major gate). */
const SAME_AS_KEYS = [
  'spotify',
  'appleMusic',
  'boomplay',
  'youtube',
  'soundcloud',
  'audiomack',
  'deezer',
  'instagram',
  'tiktok',
] as const

/** Same rules as ArtistBadge public visibility. */
export function isVerifiedArtistStanding(isArtist: boolean, artistStatus?: ArtistStatus): boolean {
  if (!isArtist) return false
  if (!artistStatus) return true
  return artistStatus === 'active' || artistStatus === 'warned'
}

export function normalizeHttpUrl(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  let url = trimmed
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

export function collectSameAsUrls(links: ArtistApplicationLinks | null | undefined): string[] {
  if (!links || typeof links !== 'object') return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const key of SAME_AS_KEYS) {
    const normalized = normalizeHttpUrl(links[key])
    if (!normalized) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }
  return out
}

export function hasMajorDspLink(links: ArtistApplicationLinks | null | undefined): boolean {
  if (!links) return false
  return MAJOR_DSP_KEYS.some((key) => !!normalizeHttpUrl(links[key]))
}

export type ProfileSeoInput = {
  username: string
  displayName: string | null
  avatarUrl: string | null
  isArtist: boolean
  artistStatus: ArtistStatus
  isPrivate: boolean
  applicationDisplayName: string | null
  links: ArtistApplicationLinks | null
}

export type MusicGroupJsonLd = {
  '@context': 'https://schema.org'
  '@type': 'MusicGroup'
  name: string
  url: string
  image: string
  description: string
  sameAs: string[]
}

/**
 * Returns MusicGroup JSON-LD or null when the profile must not advertise
 * as an artist entity (unverified, private, frozen/removed, or no major DSP).
 */
export function buildArtistMusicGroupJsonLd(input: ProfileSeoInput): MusicGroupJsonLd | null {
  if (input.isPrivate) return null
  if (!isVerifiedArtistStanding(input.isArtist, input.artistStatus)) return null
  if (!hasMajorDspLink(input.links)) return null

  const sameAs = collectSameAsUrls(input.links)
  if (sameAs.length === 0) return null

  const name =
    (input.applicationDisplayName || '').trim() ||
    (input.displayName || '').trim() ||
    input.username

  const username = input.username.trim()
  if (!username) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name,
    url: `https://trymargo.com/profile/${encodeURIComponent(username)}`,
    image: input.avatarUrl?.trim() || 'https://trymargo.com/icon.svg',
    description: `${name} on Margo — a verified artist. Listen on streaming platforms and talk in lyrics.`,
    sameAs,
  }
}
