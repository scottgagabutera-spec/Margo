import { fetchProfilePeek } from '@/lib/profile-warm'
import { createTemporaryMemberHandle } from '@/lib/temporary-member-handle'
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  usernameBaseFromProviderName,
  validateUsernameChoice,
} from '@/lib/username-validator'

async function isUsernameTaken(candidate: string): Promise<boolean> {
  const peek = await fetchProfilePeek(candidate)
  return !!peek?.profile?.username
}

/** Pick a free username from a provider name; add digits only when needed. */
export async function pickAvailableUsernameFromProviderName(fullName: string): Promise<string> {
  const base = usernameBaseFromProviderName(fullName)
  if (!base) return createTemporaryMemberHandle()

  const roots: string[] = [base]
  if (base.length > USERNAME_MIN_LENGTH) {
    roots.push(base.slice(0, USERNAME_MAX_LENGTH - 2))
  }

  for (const root of roots) {
    if (root.length < USERNAME_MIN_LENGTH) continue
    const bare = validateUsernameChoice(root)
    if (bare.ok && !(await isUsernameTaken(bare.value))) {
      return bare.value
    }
    for (let n = 2; n < 1000; n++) {
      const suffix = String(n)
      const trimmed = root.slice(0, USERNAME_MAX_LENGTH - suffix.length)
      const candidate = `${trimmed}${suffix}`
      const v = validateUsernameChoice(candidate)
      if (!v.ok) continue
      if (!(await isUsernameTaken(v.value))) return v.value
    }
  }

  return createTemporaryMemberHandle()
}
