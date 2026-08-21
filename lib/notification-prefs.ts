import type { SupabaseClient } from '@supabase/supabase-js'

/** Mirrors app/settings/page.tsx's NotificationPrefs keys for the two
 * notification types that are created from app code (resonate, lyric_back).
 * 'follow'/'follow_request' and 'message' notifications are created by
 * database triggers not in this repo's tracked migration history — see the
 * PR notes; wiring those requires a schema change reviewed separately, not
 * a client-side check like this one. */
export type AppCreatedNotificationPrefKey = 'resonate' | 'lyricBack'

/**
 * Best-effort check of whether a recipient wants this notification type.
 * "Best-effort" because `profiles` RLS ("owner and accepted followers read
 * full profile", 20260728_account_settings.sql) can block reading a
 * private profile's row for a non-follower actor — e.g. a stranger
 * resonating with a private account's post. When the preference can't be
 * read at all (RLS-blocked, row missing, malformed settings), this fails
 * OPEN (returns true / "allowed") rather than silently suppressing a
 * notification the recipient never actually disabled — matching the
 * existing behavior for every case this check doesn't yet cover, rather
 * than introducing a new way for notifications to go silently missing.
 */
export async function isNotificationAllowed(
  supabase: SupabaseClient,
  recipientId: string,
  prefKey: AppCreatedNotificationPrefKey,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', recipientId)
      .maybeSingle()
    if (error || !data) return true
    const notifications = (data as { settings?: { notifications?: Record<string, boolean> } })
      .settings?.notifications
    const pref = notifications?.[prefKey]
    return pref !== false
  } catch {
    return true
  }
}
