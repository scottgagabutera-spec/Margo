/**
 * DiceBear Lorelei (MIT) — deterministic portraits when a user has no upload.
 * PNG for crisp rendering inside portrait frames (SVG can fail on some WebViews).
 * @see https://www.dicebear.com/licenses/
 */
export function defaultAvatarUrlForSeed(seed: string, size = 132): string {
  const s = (seed || 'margo').trim().slice(0, 64)
  return (
    'https://api.dicebear.com/9.x/lorelei/png'
    + '?seed=' + encodeURIComponent(s)
    + '&size=' + String(size)
    + '&backgroundColor=1a1a1e,252528,2a2420'
  )
}

export function isDefaultAvatarUrl(url: string | null | undefined): boolean {
  return !!url?.includes('api.dicebear.com/')
}
