const KEY = 'margo:profile-edit-draft'

export type ProfileEditDraft = {
  displayName: string
  username: string
  bio: string
  lyric: string
  song: string
  artist: string
  catalogSongId: string | null
  isPrivate: boolean
  artistLinkDraft: Record<string, string>
  savedAt: number
}

export function readProfileEditDraft(userId: string): ProfileEditDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`${KEY}:${userId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ProfileEditDraft
    if (Date.now() - parsed.savedAt > 4 * 60 * 60 * 1000) return null
    return parsed
  } catch {
    return null
  }
}

export function writeProfileEditDraft(userId: string, draft: Omit<ProfileEditDraft, 'savedAt'>) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(`${KEY}:${userId}`, JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    /* quota */
  }
}

export function clearProfileEditDraft(userId: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(`${KEY}:${userId}`)
  } catch {
    /* ignore */
  }
}
