export const CATALOG_ENSURE_TITLE_MAX = 200
export const CATALOG_ENSURE_ARTIST_MAX = 200
export const CATALOG_ENSURE_SOURCE_ID_MAX = 128
export const CATALOG_ENSURE_ARTWORK_URL_MAX = 2048

export function validateCatalogEnsureFields(input: {
  id: string
  title: string
  artist: string
  artwork?: string | null
}): string | null {
  if (input.id.length > CATALOG_ENSURE_SOURCE_ID_MAX) return 'id too long'
  if (input.title.length > CATALOG_ENSURE_TITLE_MAX) return 'title too long'
  if (input.artist.length > CATALOG_ENSURE_ARTIST_MAX) return 'artist too long'
  const art = input.artwork?.trim()
  if (art && art.length > CATALOG_ENSURE_ARTWORK_URL_MAX) return 'artwork url too long'
  return null
}
