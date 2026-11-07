import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { type ProfileSettingsJson } from '@/lib/welcome-profile-settings'
import { onboardingFromSettings } from '@/lib/welcome-profile-settings'
import { welcomeSeriesCopy } from '@/lib/welcome-series/copy'
import {
  planWelcomeSeriesSends,
  type WelcomeSeriesActivity,
} from '@/lib/welcome-series/eligibility'
import { mergeWelcomeSeriesOnboarding } from '@/lib/welcome-series/merge-flags'
import { utcCalendarDay } from '@/lib/welcome-series/time'

async function loadActivity(admin: SupabaseClient, profileId: string): Promise<WelcomeSeriesActivity> {
  const [mem, posts, follows, apps, prof] = await Promise.all([
    admin.from('memories').select('id', { count: 'exact', head: true }).eq('owner_profile_id', profileId),
    admin.from('profiles').select('posts_count').eq('id', profileId).maybeSingle(),
    admin
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', profileId)
      .eq('status', 'accepted'),
    admin.from('artist_applications').select('id', { count: 'exact', head: true }).eq('profile_id', profileId),
    admin.from('profiles').select('settings, following_count').eq('id', profileId).maybeSingle(),
  ])

  const followingCount = Math.max(
    prof.data?.following_count ?? 0,
    follows.count ?? 0,
  )

  return {
    memoryCount: mem.count ?? 0,
    postCount: (posts.data?.posts_count as number | undefined) ?? 0,
    followingCount,
    hasArtistApplication: (apps.count ?? 0) > 0,
  }
}

async function markSkippedNudges(
  admin: SupabaseClient,
  profileId: string,
  settings: ProfileSettingsJson,
  activity: WelcomeSeriesActivity,
  nowIso: string,
): Promise<ProfileSettingsJson> {
  let next = settings
  const flags = onboardingFromSettings(next)
  const onboarding = (next.onboarding && typeof next.onboarding === 'object'
    ? { ...(next.onboarding as Record<string, unknown>) }
    : {}) as Record<string, unknown>

  const patch: Record<string, string> = {}
  if (activity.memoryCount > 0 && !onboarding.nudgeMemorySentAt) {
    patch.nudgeMemorySentAt = `skipped:${nowIso}`
  }
  if (activity.postCount > 0 && !onboarding.nudgeLyricSentAt) {
    patch.nudgeLyricSentAt = `skipped:${nowIso}`
  }
  if (activity.followingCount >= 1 && !onboarding.nudgeFollowSentAt) {
    patch.nudgeFollowSentAt = `skipped:${nowIso}`
  }
  if (activity.hasArtistApplication && !onboarding.artistGuideSentAt) {
    patch.artistGuideSentAt = `skipped:${nowIso}`
  }

  if (Object.keys(patch).length === 0) return next

  next = mergeWelcomeSeriesOnboarding(next, patch)
  await admin.from('profiles').update({ settings: next }).eq('id', profileId)
  return next
}

export type WelcomeSeriesSyncResult = {
  sent: string[]
  skipped: boolean
}

export async function runWelcomeSeriesSync(input: {
  profileId: string
  devOverrideHours: number | null
}): Promise<WelcomeSeriesSyncResult> {
  const admin = getSupabaseAdmin()
  const nowMs = Date.now()
  const nowIso = new Date(nowMs).toISOString()

  const { data: profile, error } = await admin
    .from('profiles')
    .select('settings')
    .eq('id', input.profileId)
    .maybeSingle()

  if (error || !profile) {
    return { sent: [], skipped: true }
  }

  let settings = (profile.settings as ProfileSettingsJson | null) ?? {}
  const activity = await loadActivity(admin, input.profileId)
  settings = await markSkippedNudges(admin, input.profileId, settings, activity, nowIso)

  const onboardingRole = onboardingFromSettings(settings).role
  const plan = planWelcomeSeriesSends({
    settings,
    activity,
    nowMs,
    devOverrideHours: input.devOverrideHours,
    onboardingRole,
  })

  if (plan.length === 0) {
    return { sent: [], skipped: false }
  }

  const sent: string[] = []
  let settingsCursor = settings

  for (const item of plan) {
    const copy = welcomeSeriesCopy(item.kind)
    const { error: insertErr } = await admin.from('notifications').insert({
      recipient_id: input.profileId,
      type: 'system_welcome',
      actor_id: null,
      data: {
        kind: item.kind,
        title: copy.title,
        buttonLabel: copy.buttonLabel,
      },
    })

    if (insertErr) {
      if (insertErr.code === '23505') {
        const flagValue = nowIso
        settingsCursor = mergeWelcomeSeriesOnboarding(settingsCursor, {
          [item.flagKey]: flagValue,
          ...(item.isNudge ? { welcomeSeriesLastNudgeDay: utcCalendarDay(nowMs) } : {}),
        })
        continue
      }
      console.error('[welcome-series] insert', item.kind, insertErr.message)
      continue
    }

    const flagValue = nowIso
    settingsCursor = mergeWelcomeSeriesOnboarding(settingsCursor, {
      [item.flagKey]: flagValue,
      ...(item.isNudge ? { welcomeSeriesLastNudgeDay: utcCalendarDay(nowMs) } : {}),
    })
    sent.push(item.kind)
  }

  if (sent.length > 0 || settingsCursor !== settings) {
    await admin.from('profiles').update({ settings: settingsCursor }).eq('id', input.profileId)
  }

  return { sent, skipped: false }
}
