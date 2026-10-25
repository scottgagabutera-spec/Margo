/** Shared password rules for signup, Settings, and reset. */

export const AUTH_PASSWORD_MIN_LENGTH = 10

/** Short requirement hint (signup / reset). */
export const AUTH_PASSWORD_REQUIREMENTS_SHORT = `${AUTH_PASSWORD_MIN_LENGTH}+ chars, letter & number`

/** @deprecated use AUTH_PASSWORD_REQUIREMENTS_SHORT */
export const AUTH_PASSWORD_REQUIREMENTS_LINE = AUTH_PASSWORD_REQUIREMENTS_SHORT

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; message: string }

export type PasswordStrength = 'empty' | 'too_short' | 'weak' | 'fair' | 'strong'

export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
    return { ok: false, message: `Use at least ${AUTH_PASSWORD_MIN_LENGTH} characters.` }
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { ok: false, message: 'Add at least one letter.' }
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: 'Add at least one number.' }
  }
  return { ok: true }
}

export function passwordStrengthHint(password: string): PasswordStrength {
  if (!password) return 'empty'
  if (password.length < AUTH_PASSWORD_MIN_LENGTH) return 'too_short'
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSymbol = /[^a-zA-Z0-9]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  if (!hasLetter || !hasDigit) return 'weak'
  if (password.length >= 12 && hasSymbol && hasUpper && hasLower) return 'strong'
  if (password.length >= 10 && hasUpper && hasLower) return 'fair'
  return 'fair'
}

export function passwordStrengthLabel(strength: PasswordStrength): string {
  switch (strength) {
    case 'empty':
      return ''
    case 'too_short':
      return 'Weak'
    case 'weak':
      return 'Weak'
    case 'fair':
      return 'Fair'
    case 'strong':
      return 'Strong'
    default:
      return ''
  }
}

/** 0–4 filled segments for the meter bar. */
export function passwordStrengthSegments(strength: PasswordStrength): number {
  switch (strength) {
    case 'empty':
      return 0
    case 'too_short':
    case 'weak':
      return 1
    case 'fair':
      return 3
    case 'strong':
      return 4
    default:
      return 0
  }
}

export function passwordStrengthMeterColor(strength: PasswordStrength): string {
  if (strength === 'strong') return 'var(--success)'
  if (strength === 'fair') return 'var(--warning)'
  if (strength === 'weak' || strength === 'too_short') return 'var(--destructive)'
  return 'var(--border)'
}

/** Map Supabase / GoTrue / our API errors to plain field copy. */
export function parsePasswordErrorMessage(raw: string | undefined | null): string {
  const msg = (raw || '').trim()
  if (!msg) return 'Could not use that password. Try another.'
  const lower = msg.toLowerCase()
  if (lower.includes('weak_password') || lower.includes('password is known')) {
    return 'That password is too common. Try a longer mix of letters and numbers.'
  }
  if (lower.includes('at least') && lower.includes('character')) {
    return msg
  }
  if (lower.includes('should be at least')) {
    const n = msg.match(/\d+/)?.[0]
    return n ? `Use at least ${n} characters.` : msg
  }
  if (lower.includes('uppercase') || lower.includes('lowercase')) {
    return 'Use upper and lower case letters.'
  }
  if (lower.includes('number') || lower.includes('digit')) {
    return 'Add at least one number.'
  }
  if (lower.includes('symbol') || lower.includes('special')) {
    return 'Add a symbol.'
  }
  if (lower.includes('password') && !lower.includes('invalid login')) {
    if (lower.includes('weak')) {
      return 'That password is too weak. Use letters and numbers.'
    }
  }
  return msg.length <= 160 ? msg : 'Could not use that password. Try another.'
}
