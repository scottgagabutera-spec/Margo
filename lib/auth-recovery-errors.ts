/** User-facing copy for password recovery — never raw Supabase strings. */

export const RECOVERY_RESEND_NEUTRAL_MESSAGE =
  'If that email has an account, we sent a reset link.'

export type RecoveryUrlErrorKind = 'expired' | 'already_used' | 'invalid' | 'generic'

export type RecoveryVerifyErrorKind = 'expired' | 'already_used' | 'invalid' | 'generic'

export interface SupabaseAuthErrorShape {
  message?: string | null
  code?: string | null
}

function norm(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

/** Map error params Supabase puts on redirect URLs. */
export function classifyRecoveryUrlError(
  error: string | null | undefined,
  errorCode: string | null | undefined,
  errorDescription: string | null | undefined,
): RecoveryUrlErrorKind {
  const code = norm(errorCode)
  const desc = norm(errorDescription)
  const err = norm(error)

  if (
    code.includes('otp_expired') ||
    code.includes('expired') ||
    desc.includes('expired') ||
    err.includes('expired')
  ) {
    return 'expired'
  }
  if (
    code.includes('already') ||
    desc.includes('already been used') ||
    desc.includes('already used') ||
    desc.includes('invalidated')
  ) {
    return 'already_used'
  }
  if (
    code.includes('invalid') ||
    err.includes('invalid') ||
    desc.includes('invalid')
  ) {
    return 'invalid'
  }
  if (error || errorCode || errorDescription) return 'generic'
  return 'generic'
}

export function recoveryUrlErrorMessage(kind: RecoveryUrlErrorKind): string {
  switch (kind) {
    case 'expired':
      return 'This link expired.'
    case 'already_used':
      return 'This link was already used.'
    case 'invalid':
      return 'This link is not valid.'
    default:
      return 'This link did not work.'
  }
}

export function classifyVerifyOtpError(error: SupabaseAuthErrorShape | null | undefined): RecoveryVerifyErrorKind {
  const code = norm(error?.code)
  const msg = norm(error?.message)

  if (msg.includes('expired or is invalid') || msg.includes('invalid or expired')) return 'invalid'
  if (code.includes('otp_expired') || msg.includes('expired')) return 'expired'
  if (msg.includes('already been used') || msg.includes('already used')) return 'already_used'
  if (
    code.includes('invalid') ||
    msg.includes('invalid') ||
    msg.includes('token') && msg.includes('not')
  ) {
    return 'invalid'
  }
  return 'generic'
}

export function recoveryVerifyErrorMessage(kind: RecoveryVerifyErrorKind): string {
  switch (kind) {
    case 'expired':
      return 'That code expired.'
    case 'already_used':
      return 'That code was already used.'
    case 'invalid':
      return 'That code is not valid.'
    default:
      return 'Could not verify. Try again.'
  }
}

export type RecoveryFlowPhase =
  | 'loading'
  | 'url_error'
  | 'continue'
  | 'code'
  | 'password'
  | 'done'

export function resolveInitialRecoveryPhase(input: {
  urlErrorKind: RecoveryUrlErrorKind | null
}): Exclude<RecoveryFlowPhase, 'loading' | 'done' | 'password' | 'continue'> {
  if (input.urlErrorKind) return 'url_error'
  return 'code'
}

export function shouldEnableContinueButton(tokenHash: string | null, recoveryType: 'recovery' | null): boolean {
  return Boolean(tokenHash && recoveryType === 'recovery')
}
