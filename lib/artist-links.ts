import {
  collectSameAsUrls,
  normalizeHttpUrl,
  type ArtistApplicationLinks,
} from '@/lib/artist-music-group'

export type ArtistLinkKey =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'x'
  | 'spotify'
  | 'appleMusic'
  | 'soundcloud'
  | 'audiomack'
  | 'boomplay'
  | 'linktree'

export const ARTIST_LINK_FIELDS: {
  key: ArtistLinkKey
  label: string
}[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'x', label: 'X' },
  { key: 'spotify', label: 'Spotify' },
  { key: 'appleMusic', label: 'Apple Music' },
  { key: 'soundcloud', label: 'SoundCloud' },
  { key: 'audiomack', label: 'Audiomack' },
  { key: 'boomplay', label: 'Boomplay' },
  { key: 'linktree', label: 'Linktree' },
]

const HANDLE_HOST: Partial<Record<ArtistLinkKey, (h: string) => string>> = {
  instagram: (h) => `https://instagram.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  youtube: (h) => `https://youtube.com/@${h}`,
  x: (h) => `https://x.com/${h}`,
  soundcloud: (h) => `https://soundcloud.com/${h}`,
  audiomack: (h) => `https://audiomack.com/${h}`,
  boomplay: (h) => `https://www.boomplay.com/artists/${h}`,
  linktree: (h) => `https://linktr.ee/${h}`,
}

export function coerceArtistLink(key: ArtistLinkKey, raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes('.')) {
    return normalizeHttpUrl(trimmed)
  }
  const handle = trimmed.replace(/^@/, '').replace(/\s+/g, '')
  if (!handle) return null
  const toUrl = HANDLE_HOST[key]
  if (toUrl) return normalizeHttpUrl(toUrl(handle))
  return normalizeHttpUrl(trimmed)
}

export function sanitizeArtistLinks(
  input: Record<string, string | undefined> | null | undefined
): ArtistApplicationLinks {
  const out: ArtistApplicationLinks = {}
  if (!input) return out
  for (const field of ARTIST_LINK_FIELDS) {
    const coerced = coerceArtistLink(field.key, input[field.key] || '')
    if (coerced) out[field.key] = coerced
  }
  return out
}

export function artistLinksForSameAs(
  live: ArtistApplicationLinks | null | undefined,
  application: ArtistApplicationLinks | null | undefined
): ArtistApplicationLinks | null {
  const liveUrls = collectSameAsUrls(live)
  if (liveUrls.length > 0) return live ?? null
  return application ?? null
}
