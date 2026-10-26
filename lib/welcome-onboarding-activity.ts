/** Signals that a profile predates welcome onboarding (posts, social graph, avatar). */
export type ProfileActivitySignals = {
  postsCount?: number
  followersCount?: number
  followingCount?: number
  hasAvatar?: boolean
}

export function hasProfileActivity(activity: ProfileActivitySignals | null | undefined): boolean {
  if (!activity) return false
  if ((activity.postsCount ?? 0) > 0) return true
  if ((activity.followersCount ?? 0) > 0) return true
  if ((activity.followingCount ?? 0) > 0) return true
  if (activity.hasAvatar === true) return true
  return false
}

export function activityFromProfileRow(row: {
  posts_count?: number | null
  followers_count?: number | null
  following_count?: number | null
  avatar_url?: string | null
} | null | undefined): ProfileActivitySignals {
  if (!row) return {}
  return {
    postsCount: Math.max(0, Number(row.posts_count) || 0),
    followersCount: Math.max(0, Number(row.followers_count) || 0),
    followingCount: Math.max(0, Number(row.following_count) || 0),
    hasAvatar: !!(row.avatar_url && String(row.avatar_url).trim()),
  }
}
