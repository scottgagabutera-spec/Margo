import { DISCOVER_VIBES } from './discover-vibes.ts'
import type { WelcomeDraftRole } from './welcome-draft.ts'
import { isWelcomeCreatorType, type WelcomeCreatorType } from './welcome-role-ui.ts'

const ALLOWED_MOODS = new Set<string>(DISCOVER_VIBES.filter((v) => v !== 'ALL'))

export type ProfileSettingsJson = Record<string, unknown>

export type OnboardingSettings = {
  role?: WelcomeDraftRole
  completedAt?: string
  creatorType?: WelcomeCreatorType
}

/** User-chosen Discover moods — same vocabulary as Discover filters. */
export type TasteSettings = {
  vibes?: string[]
}

export function sanitizeWelcomeMoods(raw: string[]): string[] {
  const out: string[] = []
  for (const item of raw) {
    const upper = item.trim().toUpperCase()
    if (ALLOWED_MOODS.has(upper)) {
      if (!out.includes(upper)) out.push(upper)
    }
  }
  return out
}

export function tasteVibesFromSettings(settings: ProfileSettingsJson | null | undefined): string[] {
  const taste = settings?.taste
  if (!taste || typeof taste !== 'object') return []
  const vibes = (taste as TasteSettings).vibes
  if (!Array.isArray(vibes)) return []
  return sanitizeWelcomeMoods(vibes.filter((v): v is string => typeof v === 'string'))
}

export function onboardingFromSettings(settings: ProfileSettingsJson | null | undefined): OnboardingSettings {
  const onboarding = settings?.onboarding
  if (!onboarding || typeof onboarding !== 'object') return {}
  const role = (onboarding as OnboardingSettings).role
  const completedAt = (onboarding as OnboardingSettings).completedAt
  const creatorType = (onboarding as OnboardingSettings).creatorType
  return {
    role: role === 'listener' || role === 'artist' || role === 'both' ? role : undefined,
    completedAt: typeof completedAt === 'string' ? completedAt : undefined,
    creatorType: isWelcomeCreatorType(creatorType) ? creatorType : undefined,
  }
}

export function mergeTasteVibesSettings(
  settings: ProfileSettingsJson | null | undefined,
  vibes: string[],
): ProfileSettingsJson {
  const base = settings && typeof settings === 'object' ? { ...settings } : {}
  const taste = base.taste && typeof base.taste === 'object'
    ? { ...(base.taste as Record<string, unknown>) }
    : {}
  taste.vibes = sanitizeWelcomeMoods(vibes)
  base.taste = taste
  return base
}

export function mergeOnboardingSettings(
  settings: ProfileSettingsJson | null | undefined,
  patch: {
    role?: WelcomeDraftRole | null
    completedAt?: string
    creatorType?: WelcomeCreatorType | null
  },
): ProfileSettingsJson {
  const base = settings && typeof settings === 'object' ? { ...settings } : {}
  const prev = base.onboarding && typeof base.onboarding === 'object'
    ? { ...(base.onboarding as Record<string, unknown>) }
    : {}
  if ('role' in patch) {
    if (patch.role == null) delete prev.role
    else prev.role = patch.role
  }
  if (patch.completedAt !== undefined) prev.completedAt = patch.completedAt
  if ('creatorType' in patch) {
    if (patch.creatorType == null) delete prev.creatorType
    else prev.creatorType = patch.creatorType
  }
  base.onboarding = prev
  return base
}
