/** User-facing sign-in failure — same for wrong password, unknown email, unconfirmed. */
export const SIGN_IN_NEUTRAL_MESSAGE = 'Incorrect email or password.'

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

/** Always neutral — callers must not branch UI on LoginErrorCode for sign-in copy. */
export function loginErrorMessage(_code: LoginErrorCode): string {
  return SIGN_IN_NEUTRAL_MESSAGE
}

/** API body for failed password sign-in — no `code` field (anti-enumeration). */
export function loginFailureResponseBody(): { error: string } {
  return { error: SIGN_IN_NEUTRAL_MESSAGE }
}
