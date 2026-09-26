'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import type { StoryRingAuthor } from '@/lib/stories/types'

const supabase = createClient()

export function useStoryRing(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true
  const { user, identity } = useIdentity()
  const viewerId = user && !user.isAnonymous ? user.id : null
  const [authors, setAuthors] = useState<StoryRingAuthor[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!viewerId) {
      setAuthors([])
      setLoading(false)
      return
    }

    const nowIso = new Date().toISOString()

    const { data: followRows } = await supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', viewerId)
      .eq('status', 'accepted')

    const authorIds = [
      viewerId,
      ...((followRows || []).map((r) => r.followee_id as string)),
    ]

    const { data: storyRows, error } = await supabase
      .from('stories')
      .select(`
        id,
        author_profile_id,
        created_at,
        profiles:author_profile_id ( username, display_name, avatar_url )
      `)
      .in('author_profile_id', authorIds)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[useStoryRing]', error)
      setAuthors([])
      setLoading(false)
      return
    }

    const storyIds = (storyRows || []).map((r) => r.id as string)
    let seenStoryIds = new Set<string>()
    if (storyIds.length > 0) {
      const { data: views } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_profile_id', viewerId)
        .in('story_id', storyIds)
      seenStoryIds = new Set((views || []).map((v) => v.story_id as string))
    }

    const byAuthor = new Map<string, StoryRingAuthor>()
    for (const row of storyRows || []) {
      const profileId = row.author_profile_id as string
      if (byAuthor.has(profileId)) continue
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const storyId = row.id as string
      byAuthor.set(profileId, {
        profileId,
        username: (profile as { username?: string })?.username || '',
        displayName: (profile as { display_name?: string | null })?.display_name ?? null,
        avatarUrl: (profile as { avatar_url?: string | null })?.avatar_url ?? null,
        hasUnseen: !seenStoryIds.has(storyId),
        latestStoryAt: String(row.created_at),
        isSelf: profileId === viewerId,
      })
    }

    const sorted = [...byAuthor.values()].sort((a, b) => {
      if (a.isSelf && !b.isSelf) return -1
      if (!a.isSelf && b.isSelf) return 1
      return b.latestStoryAt.localeCompare(a.latestStoryAt)
    })

    setAuthors(sorted)
    setLoading(false)
  }, [viewerId])

  useEffect(() => {
    if (!enabled) return
    void load()
  }, [enabled, load])

  useEffect(() => {
    if (!enabled || !viewerId) return

    const channel = supabase
      .channel(`story-ring:${viewerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
        void load()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, viewerId, load])

  const selfAuthor = useMemo(
    () => authors.find((a) => a.isSelf) ?? null,
    [authors],
  )

  return { authors, selfAuthor, loading, reload: load, signedIn: !!viewerId }
}
