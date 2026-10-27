/** Routes where Hub scroll-to-dismiss tracks primary tab panes. */
export function isHubPrimaryScrollSurface(pathname: string | null | undefined): boolean {
  const path = (pathname || '').split('?')[0]
  return path === '/feed'
    || path === '/discover'
    || path === '/compose'
    || path === '/you'
}

/** Routes where the mobile Hub sheet should fill from the top (no app nav). */
export function isHubSheetFlushTopPath(pathname: string | null | undefined): boolean {
  const path = (pathname || '').split('?')[0]
  return path === '/signin'
    || path === '/forgot-password'
    || path === '/reset-password'
}
