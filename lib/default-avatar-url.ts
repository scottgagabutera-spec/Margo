/**
 * DiceBear Notionists (MIT) — deterministic SVG avatars when a user has no upload.
 * @see https://www.dicebear.com/licenses/
 */
export function defaultAvatarUrlForSeed(seed: string): string {
  const s = (seed || 'margo').trim().slice(0, 64)
  return (
    'https://api.dicebear.com/9.x/notionists/svg'
    + '?seed=' + encodeURIComponent(s)
    + '&backgroundColor=1a1a1e,252528'
    + '&radius=12'
  )
}
