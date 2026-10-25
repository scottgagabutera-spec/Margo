/**
 * Client-side username and display-name rules.
 * Server enforcement is Piece B (not in this PR).
 */

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 30

/** Exact-match reserved handles (lowercase). Extend in this file only. */
export const RESERVED_USERNAMES: readonly string[] = [
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
  'margo',
  'trymargo',
  'officialmargo',
  'margoofficial',
  'margoteam',
  'margosupport',
  'margo_app',
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
  'artist',
  'producer',
  'songwriter',
  'label',
  'manager',
  'musicfan',
  'fan',
  'creator',
]

const SCOTT_PERSONAL = ['scott', 'gaga', 'gagara'] as const

const SCOTT_COMBOS = [
  'scottgaga',
  'gagascott',
  'scott_gaga',
  'gaga_scott',
  'buteragaga',
  'gagabutera',
  'scottbutera',
  'buteragagascott',
] as const

const CONTAINS_BLOCK = ['butera', 'gagabutera'] as const

const BRAND_AUTHORITY = [
  'margo',
  'trymargo',
  'officialmargo',
  'margoofficial',
  'margoteam',
  'margosupport',
  'margo_app',
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
] as const

const OFFICIAL_AFFIXES = [
  'official',
  'real',
  'the',
  'team',
  'support',
  'admin',
  'staff',
] as const

const TYPO_REPLACEMENTS: readonly [string, string][] = [
  ['offical', 'official'],
  ['officiial', 'official'],
  ['buterra', 'butera'],
  ['buteraa', 'butera'],
]

/** Strip to allowed chars and lowercase. */
export function normalizeUsernameInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, USERNAME_MAX_LENGTH)
}

export function collapseRepeatedLetters(value: string): string {
  return value.replace(/(.)\1+/g, '$1')
}

/** Lowercase, drop _ and ., leet fold, collapse repeats, apply typo fixes. */
export function usernameMatchKey(raw: string): string {
  let base = normalizeUsernameInput(raw).replace(/[_.]/g, '')
  for (const [from, to] of TYPO_REPLACEMENTS) {
    base = base.split(from).join(to)
  }
  base = base
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
  return collapseRepeatedLetters(base)
}

/** @deprecated use usernameMatchKey */
export function usernameReservedMatchKey(raw: string): string {
  return usernameMatchKey(raw)
}

function keysEqual(a: string, b: string): boolean {
  return usernameMatchKey(a) === usernameMatchKey(b)
}

function isScottPersonalKey(key: string): boolean {
  return SCOTT_PERSONAL.some((n) => usernameMatchKey(n) === key)
}

function isBrandAuthorityKey(key: string): boolean {
  return BRAND_AUTHORITY.some((n) => usernameMatchKey(n) === key)
}

function affixJoinBlocked(key: string, token: string): boolean {
  for (const affix of OFFICIAL_AFFIXES) {
    const ak = usernameMatchKey(affix)
    const tk = usernameMatchKey(token)
    if (key === ak + tk || key === tk + ak) return true
    if (key === usernameMatchKey('the') + ak + tk) return true
    if (key === ak + usernameMatchKey('the') + tk) return true
  }
  return false
}

function scottNamesBlocked(key: string): boolean {
  for (const name of SCOTT_PERSONAL) {
    if (key === usernameMatchKey(name)) return true
  }
  for (const combo of SCOTT_COMBOS) {
    if (key === usernameMatchKey(combo)) return true
  }
  for (const a of SCOTT_PERSONAL) {
    for (const b of SCOTT_PERSONAL) {
      if (a !== b && key === usernameMatchKey(a) + usernameMatchKey(b)) return true
    }
  }
  for (const name of SCOTT_PERSONAL) {
    if (affixJoinBlocked(key, name)) return true
  }
  return false
}

function brandAuthorityBlocked(key: string): boolean {
  for (const word of BRAND_AUTHORITY) {
    if (key === usernameMatchKey(word)) return true
  }
  for (let i = 0; i < BRAND_AUTHORITY.length; i++) {
    for (let j = i + 1; j < BRAND_AUTHORITY.length; j++) {
      const a = usernameMatchKey(BRAND_AUTHORITY[i])
      const b = usernameMatchKey(BRAND_AUTHORITY[j])
      if (key === a + b || key === b + a) return true
    }
  }
  for (const word of BRAND_AUTHORITY) {
    if (affixJoinBlocked(key, word)) return true
  }
  return false
}

function containsButeraBlocked(key: string): boolean {
  for (const frag of CONTAINS_BLOCK) {
    const fk = usernameMatchKey(frag)
    if (key.includes(fk)) return true
  }
  return false
}

export function isUsernameReserved(
  raw: string,
  currentUsername?: string | null,
): boolean {
  const value = normalizeUsernameInput(raw)
  const current = currentUsername ? normalizeUsernameInput(currentUsername) : null
  if (current && value === current) return false

  const key = usernameMatchKey(value)
  if (containsButeraBlocked(key)) return true
  if (scottNamesBlocked(key)) return true
  if (brandAuthorityBlocked(key)) return true

  for (const reserved of RESERVED_USERNAMES) {
    if (keysEqual(value, reserved)) return true
  }
  return false
}

export type UsernameValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string }

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
  if (isUsernameReserved(value, currentUsername)) {
    return { ok: false, message: 'Not available.' }
  }
  return { ok: true, value }
}

/** Display names: brand/authority only (not Scott personal names). */
export function normalizeDisplayNameInput(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 30)
}

export function isDisplayNameReserved(raw: string): boolean {
  const compact = normalizeDisplayNameInput(raw).toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!compact) return false
  const key = usernameMatchKey(compact)
  return brandAuthorityBlocked(key)
}

export function validateDisplayNameChoice(raw: string): UsernameValidationResult {
  const value = normalizeDisplayNameInput(raw)
  if (!value) {
    return { ok: false, message: 'Name cannot be empty.' }
  }
  if (isDisplayNameReserved(value)) {
    return { ok: false, message: 'Not available.' }
  }
  return { ok: true, value }
}

/** Build a username base from a provider full name (letters and digits only). */
export function usernameBaseFromProviderName(fullName: string): string {
  const base = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, USERNAME_MAX_LENGTH)
  return base.length >= USERNAME_MIN_LENGTH ? base : ''
}
