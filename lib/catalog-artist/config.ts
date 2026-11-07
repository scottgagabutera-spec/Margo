/**
 * When false, Deezer artist photos are never copied to R2 for catalog_artists.
 * Display falls back to the matched Margo artist profile photo, else initials in UI.
 *
 * Set `MARGO_CATALOG_ARTIST_DEEZER_R2_INGEST=0` (or `false`) to disable.
 */
export function catalogArtistDeezerR2IngestEnabled(): boolean {
  const raw = process.env.MARGO_CATALOG_ARTIST_DEEZER_R2_INGEST?.trim().toLowerCase()
  if (!raw) return true
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false
  return true
}
