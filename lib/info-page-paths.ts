/** Info, legal, and help surfaces that hide song search in the top nav. */
export function isInfoOrHelpPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  const p = pathname.split('?')[0]
  return (
    p === '/about' ||
    p === '/contact' ||
    p === '/privacy' ||
    p === '/terms' ||
    p === '/dmca' ||
    p === '/data-deletion' ||
    p === '/help' ||
    p.startsWith('/help/') ||
    p === '/faq'
  )
}
