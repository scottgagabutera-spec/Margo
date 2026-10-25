/**
 * Client-side username rules for new choices and renames.
 * Server enforcement is a separate piece (not in this PR).
 */

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 30

/** Exact-match reserved handles (lowercase). Extend in this file only. */
export const RESERVED_USERNAMES: readonly string[] = [
  // Scott
  'butera',
  'gaga',
  'scott',
  'gagara',
  'scottgaga',
  'gagascott',
  'scott_gaga',
  'gaga_scott',
  'buteragaga',
  'gagabutera',
  'scottbutera',
  'buteragagascott',
  // Brand / platform
  'margo',
  'trymargo',
  'officialmargo',
  'margoofficial',
  'margoteam',
  'margosupport',
  'margo_app',
  // Authority / official
  'admin',
  'administrator',
  'support',
  'help',
  'official',
  'staff',
  'team',
  'moderator',
  'mod',
  'security',
  'root',
  'system',
  'api',
  'www',
  'mail',
  'null',
  'undefined',
  'ceo',
  'cto',
  'cfo',
  'coo',
  'founder',
  'cofounder',
  'co_founder',
  'owner',
  'president',
  'chairman',
  'director',
  'press',
  'legal',
  'billing',
  'safety',
  'abuse',
  'verified',
  // Future account-type words (exact only)
  'artist',
  'producer',
  'songwriter',
  'label',
  'manager',
  'musicfan',
  'fan',
  'creator',
]

const RESERVED_SET = new Set(RESERVED_USERNAMES)

/** Strip to allowed chars and lowercase (no trim of internal spaces — none allowed). */
export function normalizeUsernameInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, USERNAME_MAX_LENGTH)
}

/** Simple leet / look-alike fold for exact reserved matching only. */
export function usernameReservedMatchKey(raw: string): string {
  const base = normalizeUsernameInput(raw).replace(/_/g, '')
  return base
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
}

function isReservedCandidate(cleaned: string): boolean {
  if (RESERVED_SET.has(cleaned)) return true
  const key = usernameReservedMatchKey(cleaned)
  for (const reserved of RESERVED_USERNAMES) {
    if (usernameReservedMatchKey(reserved) === key) return true
  }
  return false
}

export type UsernameValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string }

/**
 * Validate a username choice. Existing holders keep a reserved name until they change away.
 * @param currentUsername — when unchanged, reserved names on the current handle are allowed.
 */
export function validateUsernameChoice(
  raw: string,
  currentUsername?: string | null,
): UsernameValidationResult {
  const value = normalizeUsernameInput(raw)
  const current = currentUsername ? normalizeUsernameInput(currentUsername) : null

  if (current && value === current) {
    return { ok: true, value }
  }

  if (value.length < USERNAME_MIN_LENGTH) {
    return { ok: false, message: 'Use at least 3 characters.' }
  }
  if (value.length > USERNAME_MAX_LENGTH) {
    return { ok: false, message: 'Not available.' }
  }
  if (isReservedCandidate(value)) {
    return { ok: false, message: 'Not available.' }
  }
  return { ok: true, value }
}
