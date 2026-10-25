import { validatePassword } from './auth-password-policy.ts'

export const PASSWORD_MISMATCH_MESSAGE = 'Passwords do not match.'

export type PasswordPairCheck =
  | { ok: true }
  | { ok: false; message: string; field: 'password' | 'confirm' }

export function validatePasswordPair(password: string, confirm: string): PasswordPairCheck {
  const primary = validatePassword(password)
  if (!primary.ok) {
    return { ok: false, message: primary.message, field: 'password' }
  }
  if (password !== confirm) {
    return { ok: false, message: PASSWORD_MISMATCH_MESSAGE, field: 'confirm' }
  }
  return { ok: true }
}

export function canSavePasswordPair(password: string, confirm: string): boolean {
  return validatePasswordPair(password, confirm).ok
}
