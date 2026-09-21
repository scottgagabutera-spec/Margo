'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { loadAuthorSlides } from '@/lib/stories/load-author-slides'
import type { StorySlide } from '@/lib/stories/types'

const supabase = createClient()

export type { StorySlide }

export function useAuthorStories(
  authorProfileId: string | null,
  enabled = true,
  initialSlides?: StorySlide[],
) {
  const seeded = (initialSlides?.length ?? 0) > 0
  const [slides, setSlides] = useState<StorySlide[]>(initialSlides ?? [])
  const [loading, setLoading] = useState(!seeded)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!authorProfileId) {
      setSlides([])
      return
    }
    if (!seeded) setLoading(true)
    setError(null)
    try {
      const loaded = await loadAuthorSlides(authorProfileId)
      setSlides(loaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Stories')
      if (!seeded) setSlides([])
    } finally {
      setLoading(false)
    }
  }, [authorProfileId, seeded])

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
