import { isConsentEnforcementExemptPath } from './legal/consent-paths.ts'
import { isAdminAppPath } from './admin-path.ts'

/** Paths an operator account may use without being bounced to /admin. */
export function isAdminOperatorExemptPath(pathname: string): boolean {
  if (!pathname) return true
  if (isConsentEnforcementExemptPath(pathname)) return true
  if (isAdminAppPath(pathname)) return true
  if (
    pathname === '/forgot-password'
    || pathname === '/reset-password'
    || pathname === '/contact'
    || pathname === '/data-deletion'
    || pathname === '/dmca'
    || pathname === '/faq'
    || pathname === '/about'
  ) {
    return true
  }
  if (pathname === '/help' || pathname.startsWith('/help/')) return true
  return false
}

/** Consumer app pages (document navigations) — not API routes. */
export function shouldProxyRedirectAdminFromConsumerPage(pathname: string): boolean {
  if (!pathname) return false
  if (pathname.startsWith('/api/')) return false
  if (pathname.startsWith('/_next')) return false
  return !isAdminOperatorExemptPath(pathname)
}

export const ADMIN_OPERATOR_HOME = '/admin'
