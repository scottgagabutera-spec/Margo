export function normalizeStackPath(pathname: string | null | undefined): string {
  if (!pathname) return ''
  let path = pathname.split('?')[0]
  try {
    path = decodeURIComponent(path)
  } catch {
    /* keep raw */
  }
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  return path
}

/** Destinations opened from Feed that should stack over the keepalive feed pane. */
export function isFeedStackPath(pathname: string | null | undefined): boolean {
  const p = normalizeStackPath(pathname).toLowerCase()
  if (!p || p === '/feed') return false
  if (p.startsWith('/profile/')) return true
  if (p.startsWith('/memory/')) return true
  if (p.startsWith('/memories/')) return true
  if (p.startsWith('/echoes/')) return true
  if (p.startsWith('/post/')) return true
  if (p.startsWith('/song/')) return true
  return false
}
