import { createClient } from '@/lib/supabase/client'
import type { ProfileSettingsJson } from '@/lib/welcome-profile-settings'

const supabase = createClient()

export type WelcomeProfileSnapshot = {
  settings: ProfileSettingsJson | null
  avatarUrl: string | null
  coverUrl: string | null
}

export async function fetchWelcomeProfileSnapshot(userId: string): Promise<WelcomeProfileSnapshot> {
  const { data, error } = await supabase
    .from('profiles')
    .select('settings, avatar_url, cover_url')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) {
    return { settings: null, avatarUrl: null, coverUrl: null }
  }
  return {
    settings: (data.settings as ProfileSettingsJson | null) ?? null,
    avatarUrl: (data.avatar_url as string | null) ?? null,
    coverUrl: (data.cover_url as string | null) ?? null,
  }
}

export async function persistProfileSettings(
  userId: string,
  merge: (current: ProfileSettingsJson | null) => ProfileSettingsJson,
): Promise<{ ok: true; settings: ProfileSettingsJson } | { ok: false; error: string }> {
  const snap = await fetchWelcomeProfileSnapshot(userId)
  const nextSettings = merge(snap.settings)
  const { error } = await supabase
    .from('profiles')
    .update({ settings: nextSettings })
    .eq('id', userId)
  if (error) return { ok: false, error: 'Could not save.' }
  return { ok: true, settings: nextSettings }
}
