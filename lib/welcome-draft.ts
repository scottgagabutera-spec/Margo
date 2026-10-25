/** Session draft when profile/settings have not caught up yet (fallback after saved profile). */

export type WelcomeDraftRole = 'listener' | 'artist' | 'both'

export interface WelcomeDraft {
  displayName: string
  username: string
  moods: string[]
  role: WelcomeDraftRole | null
}

const KEY_PREFIX = 'margo-welcome-draft-v1:'

export function welcomeDraftKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`
}

export function readWelcomeDraft(userId: string): WelcomeDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(welcomeDraftKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as WelcomeDraft
    if (!parsed || typeof parsed !== 'object') return null
    return {
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : '',
      username: typeof parsed.username === 'string' ? parsed.username : '',
      moods: Array.isArray(parsed.moods) ? parsed.moods.filter((m) => typeof m === 'string') : [],
      role: parsed.role === 'listener' || parsed.role === 'artist' || parsed.role === 'both'
        ? parsed.role
        : null,
    }
  } catch {
    return null
  }
}

export function writeWelcomeDraft(userId: string, draft: WelcomeDraft): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(welcomeDraftKey(userId), JSON.stringify(draft))
  } catch {
    /* quota / private mode */
  }
}
