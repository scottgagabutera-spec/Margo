export function normalizeArtistName(name: string): string {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ')
}
