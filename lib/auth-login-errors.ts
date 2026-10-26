/** Wrong password or unconfirmed email (do not reveal which). */
export const SIGN_IN_NEUTRAL_MESSAGE = 'Incorrect email or password.'

export const SIGN_IN_UNKNOWN_EMAIL_MESSAGE = "We couldn't find an account with that email."

export const SIGN_UP_EMAIL_IN_USE_MESSAGE = 'That email already has an account.'

export const RESEND_CONFIRM_NEUTRAL_MESSAGE =
  'If this email can be confirmed, a new link is on its way.'

export type LoginErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_not_found'
  | 'unknown'

export interface SupabaseLoginErrorShape {
  message?: string | null
  code?: string | null
}

/** Classify GoTrue errors for tests and server logic — never expose code to UI for enumeration. */
export function classifyLoginError(
  message: string | undefined | null,
  code?: string | null,
): LoginErrorCode {
  const c = (code || '').toLowerCase()
  if (c === 'email_not_confirmed') return 'email_not_confirmed'
  if (c === 'invalid_credentials') return 'invalid_credentials'
  if (c === 'user_not_found') return 'user_not_found'

  const msg = (message || '').toLowerCase()
  if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
    return 'email_not_confirmed'
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'invalid_credentials'
  }
  if (msg.includes('user not found')) {
    return 'user_not_found'
  }
  return 'unknown'
}

export function classifyLoginErrorFromSupabase(error: SupabaseLoginErrorShape | null | undefined): LoginErrorCode {
  return classifyLoginError(error?.message, error?.code)
}

export function loginErrorMessage(code: LoginErrorCode): string {
  if (code === 'user_not_found') return SIGN_IN_UNKNOWN_EMAIL_MESSAGE
  return SIGN_IN_NEUTRAL_MESSAGE
}

/** API body for failed password sign-in. */
export function loginFailureResponseBody(code: LoginErrorCode = 'invalid_credentials'): { error: string } {
  return { error: loginErrorMessage(code) }
}

export function signupEmailInUseMessage(message: string | undefined | null): string | null {
  const msg = (message || '').toLowerCase()
  if (
    msg.includes('already registered')
    || msg.includes('already been registered')
    || msg.includes('user already registered')
    || msg.includes('already exists')
  ) {
    return SIGN_UP_EMAIL_IN_USE_MESSAGE
  }
  return null
}
