import { normalizeUsernameInput } from './username-validator.ts'

/** DB peek says taken — false when the match is the signed-in member's own handle. */
export function usernamePeekIndicatesTaken(
  peekProfile: { id: string; username: string } | null | undefined,
  cleanedInput: string,
  currentUsername: string | null | undefined,
  currentProfileId: string | null | undefined,
): boolean {
  if (!peekProfile?.username) return false
  const peekUser = normalizeUsernameInput(peekProfile.username)
  if (peekUser !== cleanedInput) return false
  if (currentProfileId && peekProfile.id === currentProfileId) return false
  if (currentUsername && cleanedInput === normalizeUsernameInput(currentUsername)) return false
  return true
}
