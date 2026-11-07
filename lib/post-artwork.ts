/** Mirror column first, then live catalog join from `songs`. */
export function resolveCatalogArtworkUrl(
  postArtworkUrl?: string | null,
  linkedSong?: { artwork_url?: string | null } | null,
): string | null {
  const mirror = (postArtworkUrl || '').trim()
  if (mirror) return mirror
  const fromSong = (linkedSong?.artwork_url || '').trim()
  return fromSong || null
}
