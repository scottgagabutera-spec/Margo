export function isAdminAppPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  const path = pathname.split('?')[0]
  return path === '/admin' || path.startsWith('/admin/')
}
