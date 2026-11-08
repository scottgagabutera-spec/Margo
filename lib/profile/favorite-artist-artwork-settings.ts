export type FavoriteArtistArtworkMap = Record<string, string>

const SETTINGS_KEY = 'favoriteArtistsArtwork'

export function favoriteArtworkFromSettings(
  settings: Record<string, unknown> | null | undefined,
): FavoriteArtistArtworkMap {
  const raw = settings?.[SETTINGS_KEY]
  if (!raw || typeof raw !== 'object') return {}
  const out: FavoriteArtistArtworkMap = {}
  for (const [id, url] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof url === 'string' && url.trim()) out[id] = url.trim()
  }
  return out
}

export function mergeFavoriteArtworkSettings(
  settings: Record<string, unknown> | null | undefined,
  patch: FavoriteArtistArtworkMap,
): Record<string, unknown> {
  const base = settings && typeof settings === 'object' ? { ...settings } : {}
  const prev = favoriteArtworkFromSettings(base)
  return {
    ...base,
    [SETTINGS_KEY]: { ...prev, ...patch },
  }
}
