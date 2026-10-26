/** Read-only artist application / approval UI for Account Settings (no writes to is_artist). */

export type BecomeArtistSettingsState =
  | { kind: 'open_studio'; href: '/studio'; label: 'Open Studio' }
  | { kind: 'pending'; label: 'Application under review' }
  | { kind: 'apply'; href: '/apply-artist'; label: 'Apply as an artist' }
  | { kind: 'reapply'; href: '/apply-artist'; label: 'Apply as an artist' }

export function resolveBecomeArtistSettingsState(input: {
  isArtist: boolean
  applicationStatus: string | null | undefined
}): BecomeArtistSettingsState {
  if (input.isArtist) {
    return { kind: 'open_studio', href: '/studio', label: 'Open Studio' }
  }
  const status = input.applicationStatus
  if (status === 'pending') {
    return { kind: 'pending', label: 'Application under review' }
  }
  return { kind: 'apply', href: '/apply-artist', label: 'Apply as an artist' }
}
