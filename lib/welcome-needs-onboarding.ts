import { sanitizeOAuthReturnPath } from './oauth-return.ts'
import { isTemporaryMemberUsername } from './username-validator.ts'
import {
  hasProfileActivity,
  type ProfileActivitySignals,
} from './welcome-onboarding-activity.ts'
import {
  onboardingFromSettings,
  type ProfileSettingsJson,
} from './welcome-profile-settings.ts'

export type { ProfileActivitySignals } from './welcome-onboarding-activity.ts'
export { hasProfileActivity } from './welcome-onboarding-activity.ts'

/** Same-origin return path only (mirrors lib/auth-return for node:test resolution). */
const AUTH_RETURN_QUERY = 'returnTo'

function sanitizeAuthReturnPath(value: string | null | undefined): string | null {
  const safe = sanitizeOAuthReturnPath(value)
  if (!safe) return null
  const pathOnly = safe.split('?')[0]
  if (pathOnly === '/signin' || pathOnly === '/auth/callback') return null
  if (pathOnly.startsWith('/auth/')) return null
  return safe
}

export type WelcomeOnboardingIdentity = {
  username: string
  displayName: string
}

/** Auth users created at or after this instant may need welcome (rule c). UTC. */
export const MARGO_WELCOME_ONBOARDING_AUTH_CUTOFF_ISO = '2026-10-26T00:00:00.000Z'

const CUTOFF_MS = Date.parse(MARGO_WELCOME_ONBOARDING_AUTH_CUTOFF_ISO)

export type WelcomeOnboardingProfileContext = {
  identity: WelcomeOnboardingIdentity | null | undefined
  settings: ProfileSettingsJson | null | undefined
  /** When false (missing profile row or read error), fail open — no redirect. */
  profileReadOk: boolean
  authUserCreatedAt: string | null | undefined
  activity?: ProfileActivitySignals
}

/** True when created_at is not yet available for cutoff logic (null, empty, or unparseable). */
export function isAuthUserCreatedAtUnavailable(
  authUserCreatedAt: string | null | undefined,
): boolean {
  if (authUserCreatedAt == null) return true
  const trimmed = authUserCreatedAt.trim()
  if (!trimmed) return true
  return Number.isNaN(Date.parse(trimmed))
}

export function isAuthUserCreatedBeforeWelcomeCutoff(
  authUserCreatedAt: string | null | undefined,
): boolean {
  if (isAuthUserCreatedAtUnavailable(authUserCreatedAt)) return false
  return Date.parse(authUserCreatedAt!) < CUTOFF_MS
}

export function isAuthUserCreatedOnOrAfterWelcomeCutoff(
  authUserCreatedAt: string | null | undefined,
): boolean {
  if (isAuthUserCreatedAtUnavailable(authUserCreatedAt)) return false
  const ms = Date.parse(authUserCreatedAt!)
  return ms >= CUTOFF_MS
}

/** Pre-cutoff grandfather exception — only member handle with empty display still needs welcome. */
export function isPreCutoffMemberStubIdentity(
  identity: WelcomeOnboardingIdentity,
): boolean {
  const name = (identity.displayName || '').trim()
  return isTemporaryMemberUsername(identity.username) && !name
}

/** Custom username + real display name — existing Margo member, not a fresh OAuth stub row. */
export function hasEstablishedPublicIdentity(
  identity: WelcomeOnboardingIdentity | null | undefined,
): boolean {
  if (!identity) return false
  const name = (identity.displayName || '').trim()
  if (!name) return false
  if (isTemporaryMemberUsername(identity.username)) return false
  if (name === identity.username) return false
  return true
}

export function needsOnboarding(ctx: WelcomeOnboardingProfileContext): boolean {
  if (!ctx.profileReadOk) return false
  if (!ctx.identity) return false

  const completedAt = onboardingFromSettings(ctx.settings).completedAt
  if (completedAt) return false

  if (hasProfileActivity(ctx.activity)) return false

  const { username, displayName } = ctx.identity
  const name = (displayName || '').trim()

  if (isAuthUserCreatedBeforeWelcomeCutoff(ctx.authUserCreatedAt)) {
    return isPreCutoffMemberStubIdentity(ctx.identity)
  }

  if (isAuthUserCreatedAtUnavailable(ctx.authUserCreatedAt)) {
    if (hasEstablishedPublicIdentity(ctx.identity)) return false
    if (!isTemporaryMemberUsername(username)) return false
    return true
  }

  if (isTemporaryMemberUsername(username)) return true
  if (!name || name === username) return true
  if (isAuthUserCreatedOnOrAfterWelcomeCutoff(ctx.authUserCreatedAt)) return true

  return false
}

export function welcomeOnboardingPath(returnTo?: string | null): string {
  const safe = sanitizeAuthReturnPath(returnTo) || '/feed'
  return `/welcome?step=1&${AUTH_RETURN_QUERY}=${encodeURIComponent(safe)}`
}

/** Single post-auth destination resolver — provider-blind (identity + settings only). */
export function resolvePostAuthNavigation(
  ctx: WelcomeOnboardingProfileContext,
  returnTo?: string | null,
): string {
  if (needsOnboarding(ctx)) {
    return welcomeOnboardingPath(returnTo)
  }
  return sanitizeAuthReturnPath(returnTo) || '/feed'
}

const EXEMPT_PREFIXES = [
  '/welcome',
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/',
  '/terms',
  '/privacy',
  '/about',
  '/contact',
  '/dmca',
  '/data-deletion',
  '/help',
  '/faq',
]

export function isWelcomeOnboardingExemptPath(pathname: string | null | undefined): boolean {
  if (!pathname) return true
  const path = pathname.split('?')[0]
  if (path === '/welcome' || path.startsWith('/welcome/')) return true
  for (const prefix of EXEMPT_PREFIXES) {
    if (prefix.endsWith('/')) {
      if (path.startsWith(prefix)) return true
    } else if (path === prefix) {
      return true
    }
  }
  return false
}
