export type TikTokOAuthCallbackStep =
  | 'oauth_denied'
  | 'no_session_no_pending'
  | 'session_mismatch'
  | 'bad_state'
  | 'pending_expired'
  | 'no_admin'
  | 'token_error'
  | 'user_info_error'
  | 'save_error'
  | 'ok'

export function logTikTokOAuthCallback(
  step: TikTokOAuthCallbackStep,
  fields: Record<string, string | number | boolean | null | undefined> = {},
): void {
  const payload = {
    event: 'promote_tiktok_oauth_callback',
    step,
    ...fields,
  }
  if (step === 'ok') {
    console.info(JSON.stringify(payload))
  } else if (step === 'token_error' || step === 'user_info_error' || step === 'save_error') {
    console.error(JSON.stringify(payload))
  } else {
    console.warn(JSON.stringify(payload))
  }
}
