/** Prefer a small Apple/iTunes artwork size when the CDN exposes one. */
export function compactArtworkUrl(url: string | null | undefined, size = 64): string {
  if (!url) return ''
  const next = url
    .replace(/\/\d+x\d+([a-z]*)\./i, `/${size}x${size}$1.`)
    .replace(/\d+x\d+bb/gi, `${size}x${size}bb`)
  return next
}
