/** Platform URLs stored on `songs.*_url` (Studio upload). */
export type SongStreamingLinks = {
  youtubeUrl?: string | null
  spotifyUrl?: string | null
  appleMusicUrl?: string | null
  soundcloudUrl?: string | null
  audiomackUrl?: string | null
  boomplayUrl?: string | null
}

export type StreamingLinkItem = {
  id: keyof SongStreamingLinks | 'youtubePost'
  label: string
  href: string
}

const LABEL: Record<keyof SongStreamingLinks, string> = {
  youtubeUrl: 'YouTube',
  spotifyUrl: 'Spotify',
  appleMusicUrl: 'Apple Music',
  soundcloudUrl: 'SoundCloud',
  audiomackUrl: 'Audiomack',
  boomplayUrl: 'Boomplay',
}

const ORDER: (keyof SongStreamingLinks)[] = [
  'spotifyUrl',
  'appleMusicUrl',
  'youtubeUrl',
  'soundcloudUrl',
  'audiomackUrl',
  'boomplayUrl',
]

/** Map a joined `songs` row (snake_case) into camelCase link fields. */
export function mapSongStreamingLinks(row: {
  youtube_url?: string | null
  spotify_url?: string | null
  apple_music_url?: string | null
  soundcloud_url?: string | null
  audiomack_url?: string | null
  boomplay_url?: string | null
} | null | undefined): SongStreamingLinks | null {
  if (!row) return null
  const links: SongStreamingLinks = {
    youtubeUrl: row.youtube_url ?? null,
    spotifyUrl: row.spotify_url ?? null,
    appleMusicUrl: row.apple_music_url ?? null,
    soundcloudUrl: row.soundcloud_url ?? null,
    audiomackUrl: row.audiomack_url ?? null,
    boomplayUrl: row.boomplay_url ?? null,
  }
  const hasAny = ORDER.some((k) => !!links[k])
  return hasAny ? links : null
}

/**
 * Flatten catalog streaming links (+ optional post-level YouTube) for UI.
 * Skips empties; dedupes identical hrefs.
 */
export function collectStreamingLinkItems(
  links: SongStreamingLinks | null | undefined,
  postYoutubeUrl?: string | null,
): StreamingLinkItem[] {
  const out: StreamingLinkItem[] = []
  const seen = new Set<string>()
  const push = (id: StreamingLinkItem['id'], label: string, href: string | null | undefined) => {
    const trimmed = (href || '').trim()
    if (!trimmed || seen.has(trimmed)) return
    seen.add(trimmed)
    out.push({ id, label, href: trimmed })
  }

  for (const key of ORDER) {
    push(key, LABEL[key], links?.[key])
  }
  push('youtubePost', 'YouTube', postYoutubeUrl)
  return out
}
