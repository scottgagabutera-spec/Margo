import type { Identity } from '@/hooks/useIdentity'
import { sanitizeArtistLinks } from '@/lib/artist-links'

export const PROFILE_EDIT_UNSAVED_MESSAGE =
  'You have unsaved changes. Leave without saving?'

export function confirmLeaveProfileEdit(): boolean {
  if (typeof window === 'undefined') return true
  return window.confirm(PROFILE_EDIT_UNSAVED_MESSAGE)
}

export type ProfileEditFormSnapshot = {
  displayName: string
  username: string
  bio: string
  lyric: string
  song: string
  artist: string
  catalogSongId: string | null
  isPrivate: boolean
  artistLinkDraft: Record<string, string>
}

export function profileEditHasUnsavedChanges(
  identity: Identity,
  form: ProfileEditFormSnapshot,
): boolean {
  if (form.displayName.trim() !== (identity.displayName || '').trim()) return true
  if (form.username.trim().toLowerCase() !== identity.username) return true
  if (form.bio !== (identity.bio || '')) return true
  if (form.lyric !== (identity.signatureLyric || '')) return true
  if (form.song !== (identity.signatureSong || '')) return true
  if (form.artist !== (identity.signatureArtist || '')) return true
  if ((form.catalogSongId || null) !== (identity.signatureSongId || null)) return true
  if (form.isPrivate !== identity.isPrivate) return true
  if (identity.isArtist) {
    const next = sanitizeArtistLinks(form.artistLinkDraft)
    const prev = sanitizeArtistLinks(identity.artistLinks)
    if (JSON.stringify(next) !== JSON.stringify(prev)) return true
  }
  return false
}
