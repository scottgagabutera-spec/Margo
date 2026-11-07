/** Validation and display for artist application streaming/social links. */

const HTTPS_PREFIX = /^https:\/\//i

const HOST_LABELS: Array<{ match: RegExp; label: string }> = [
  { match: /spotify\.com/i, label: 'Spotify' },
  { match: /music\.apple\.com|apple\.com\/.*music/i, label: 'Apple Music' },
  { match: /youtube\.com|youtu\.be/i, label: 'YouTube' },
  { match: /instagram\.com/i, label: 'Instagram' },
  { match: /tiktok\.com/i, label: 'TikTok' },
  { match: /soundcloud\.com/i, label: 'SoundCloud' },
  { match: /bandcamp\.com/i, label: 'Bandcamp' },
  { match: /suno\.com/i, label: 'Suno' },
  { match: /twitter\.com|x\.com/i, label: 'X' },
  { match: /facebook\.com|fb\.com/i, label: 'Facebook' },
  { match: /linktr\.ee/i, label: 'Linktree' },
]

export const ARTIST_APPLICATION_MIN_LINKS = 3

export type LinkValidationResult =
  | { ok: true; urls: string[]; count: number }
  | { ok: false; error: string }

function normalizeHttpsUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^http:\/\//i.test(trimmed)) return null
  const withScheme = HTTPS_PREFIX.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/\//, '')}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

/** Distinct valid https URLs from the application link map. */
export function collectValidArtistLinks(links: Record<string, string | undefined | null>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of Object.values(links)) {
    if (typeof value !== 'string') continue
    const normalized = normalizeHttpsUrl(value)
    if (!normalized) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }
  return out
}

export function linkHostLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '')
    for (const { match, label } of HOST_LABELS) {
      if (match.test(host) || match.test(url)) return label
    }
    return host
  } catch {
    return 'Link'
  }
}

export function validateArtistApplicationLinks(input: {
  links: Record<string, string | undefined | null>
  sunoVerified: boolean
}): LinkValidationResult {
  const urls = collectValidArtistLinks(input.links)
  if (input.sunoVerified) {
    return { ok: true, urls, count: urls.length }
  }
  if (urls.length < ARTIST_APPLICATION_MIN_LINKS) {
    return {
      ok: false,
      error:
        `Add at least ${ARTIST_APPLICATION_MIN_LINKS} different links that start with https (for example Spotify, Apple Music, YouTube, or Instagram). Suno verification on its own is enough if you verify with a code in your Suno bio.`,
    }
  }
  return { ok: true, urls, count: urls.length }
}

export function cleanedArtistLinksMap(
  links: Record<string, string | undefined | null>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(links)) {
    if (typeof value !== 'string') continue
    const normalized = normalizeHttpsUrl(value)
    if (normalized) out[key] = normalized
  }
  return out
}
