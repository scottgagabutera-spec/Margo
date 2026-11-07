/** Read-only artist application / approval UI for Account Settings (no writes to is_artist). */

export type BecomeArtistSettingsState =
  | { kind: 'open_studio'; href: '/studio'; label: 'Open Studio' }
  | { kind: 'pending'; label: 'Pending' }
  | { kind: 'approved'; label: 'Approved' }
  | { kind: 'not_approved'; href: '/apply-artist'; label: 'Not approved yet' }
  | { kind: 'apply'; href: '/apply-artist'; label: 'Apply as an artist' }

export function resolveBecomeArtistSettingsState(input: {
  isArtist: boolean
  applicationStatus: string | null | undefined
}): BecomeArtistSettingsState {
  if (input.isArtist) {
    return { kind: 'open_studio', href: '/studio', label: 'Open Studio' }
  }
  const status = input.applicationStatus
  if (status === 'pending') {
    return { kind: 'pending', label: 'Pending' }
  }
  if (status === 'approved') {
    return { kind: 'approved', label: 'Approved' }
  }
  if (status === 'rejected') {
    return { kind: 'not_approved', href: '/apply-artist', label: 'Not approved yet' }
  }
  return { kind: 'apply', href: '/apply-artist', label: 'Apply as an artist' }
}
