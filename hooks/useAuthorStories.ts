'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { loadStoryMoment } from '@/lib/stories/load-story-post'
import type { StoryRow } from '@/lib/stories/types'
import type { MargoMoment } from '@/lib/moment/types'

const supabase = createClient()

export interface StorySlide {
  story: StoryRow
  moment: MargoMoment
}

export function useAuthorStories(authorProfileId: string | null, enabled = true) {
  const [slides, setSlides] = useState<StorySlide[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!authorProfileId) {
      setSlides([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const nowIso = new Date().toISOString()
      const { data, error: fetchErr } = await supabase
        .from('stories')
        .select('id, author_profile_id, post_id, expires_at, created_at')
        .eq('author_profile_id', authorProfileId)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: true })

      if (fetchErr) throw fetchErr

      const rows = (data || []).map((r) => ({
        id: String(r.id),
        authorProfileId: String(r.author_profile_id),
        postId: String(r.post_id),
        expiresAt: String(r.expires_at),
        createdAt: String(r.created_at),
      }))

      const loaded: StorySlide[] = []
      for (const story of rows) {
        const moment = await loadStoryMoment(story.postId)
        if (moment) loaded.push({ story, moment })
      }

      setSlides(loaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Stories')
      setSlides([])
    } finally {
      setLoading(false)
    }
  }, [authorProfileId])

  useEffect(() => {
    if (!enabled || !authorProfileId) return
    void load()
  }, [enabled, authorProfileId, load])

  return { slides, loading, error, reload: load }
}

export async function markStorySeen(storyId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('story_views')
    .upsert(
      { story_id: storyId, viewer_profile_id: user.id, seen_at: new Date().toISOString() },
      { onConflict: 'story_id,viewer_profile_id' },
    )
}
