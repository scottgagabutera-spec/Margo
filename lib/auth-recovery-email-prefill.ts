const RESET_REQUEST_EMAIL_KEY = 'margo.reset_request_email'

/** Remember email for code-first reset on the same browser (cleared after read). */
export function stashResetRequestEmail(email: string) {
  if (typeof window === 'undefined') return
  const trimmed = email.trim()
  if (!trimmed) return
  try {
    sessionStorage.setItem(RESET_REQUEST_EMAIL_KEY, trimmed)
  } catch {
    // private mode
  }
}

export function consumeResetRequestEmail(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = sessionStorage.getItem(RESET_REQUEST_EMAIL_KEY)
    if (value) sessionStorage.removeItem(RESET_REQUEST_EMAIL_KEY)
    return value
  } catch {
    return null
  }
}
