export type LoginErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'unknown'

export function classifyLoginError(message: string | undefined | null): LoginErrorCode {
  const msg = (message || '').toLowerCase()
  if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
    return 'email_not_confirmed'
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'invalid_credentials'
  }
  return 'unknown'
}

/** Short copy for the password field — no enumeration for wrong email/password. */
export function loginErrorMessage(code: LoginErrorCode): string {
  switch (code) {
    case 'email_not_confirmed':
      return 'Confirm your email first.'
    case 'invalid_credentials':
      return 'Incorrect email or password.'
    default:
      return 'Could not sign in. Try again.'
  }
}
