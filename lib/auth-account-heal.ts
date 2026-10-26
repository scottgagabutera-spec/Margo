import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import {
  buildLegalConsentSettings,
  legalConsentFromUserMetadata,
  mergeLegalConsentIntoSettings,
  type LegalConsentSettings,
} from '@/lib/legal/consent'
import { createTemporaryMemberHandle } from '@/lib/temporary-member-handle'

/**
 * Idempotent: ensure profiles row exists and settings.legal matches auth metadata.
 * Safe to call after OAuth, terms acceptance, or email sign-up.
 */
export async function healProfileRowAndConsent(
  supabase: SupabaseClient,
  user: User,
): Promise<{ profileReadOk: boolean }> {
  const legalFromMeta = legalConsentFromUserMetadata(user.user_metadata as Record<string, unknown>)
  const legal: LegalConsentSettings | null = legalFromMeta ?? null

  const { data: existing, error: readErr } = await supabase
    .from('profiles')
    .select('id, username, settings')
    .eq('id', user.id)
    .maybeSingle()

  if (readErr) {
    console.error('[healProfileRowAndConsent] read failed', readErr.message)
    return { profileReadOk: false }
  }

  if (!existing) {
    const settings = legal ? mergeLegalConsentIntoSettings(null, legal) : undefined
    for (let attempt = 0; attempt < 6; attempt++) {
      const username = createTemporaryMemberHandle()
      const insertRow: Record<string, unknown> = {
        id: user.id,
        username,
        display_name: '',
      }
      if (settings) insertRow.settings = settings

      const { error: insertErr } = await supabase.from('profiles').insert(insertRow)
      if (!insertErr) return { profileReadOk: true }
      if (insertErr.code !== '23505') {
        console.error('[healProfileRowAndConsent] insert failed', insertErr.message)
        return { profileReadOk: false }
      }
    }
    return { profileReadOk: false }
  }

  if (legal) {
    const settings = mergeLegalConsentIntoSettings(
      (existing.settings as Record<string, unknown> | null) ?? null,
      legal,
    )
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ settings })
      .eq('id', user.id)
    if (updateErr) {
      console.error('[healProfileRowAndConsent] settings update failed', updateErr.message)
      return { profileReadOk: false }
    }
  }

  return { profileReadOk: true }
}

/** Record terms on auth user + heal profile consent row (accept-terms / OAuth completion). */
export async function recordTermsAndHealProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<{ ok: boolean; user: User | null; error?: string }> {
  const legal = buildLegalConsentSettings()
  const { data: updateData, error: metaErr } = await supabase.auth.updateUser({
    data: {
      terms_accepted_at: legal.termsAcceptedAt,
      terms_version: legal.termsVersion,
    },
  })
  if (metaErr) {
    return { ok: false, user: null, error: metaErr.message }
  }
  const nextUser = updateData.user ?? user
  const healed = await healProfileRowAndConsent(supabase, nextUser)
  if (!healed.profileReadOk) {
    return { ok: false, user: nextUser, error: 'Could not save profile.' }
  }
  return { ok: true, user: nextUser }
}
