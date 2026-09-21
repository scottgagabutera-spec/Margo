import { warmUrl } from '@/lib/audio-engine'
import { loadStoryMoment } from '@/lib/stories/load-story-post'
import { createClient } from '@/lib/supabase/client'
import type { StoryRow, StorySlide } from '@/lib/stories/types'

const supabase = createClient()

function prefetchSlideAssets(slides: StorySlide[]): void {
  if (typeof window === 'undefined') return
  for (const slide of slides) {
    const line = slide.moment.lines[0]
    for (const url of [slide.moment.author?.avatarUrl, line?.artworkUrl]) {
      if (!url) continue
      const img = new Image()
      img.src = url
    }
    if (line?.audioUrl) warmUrl(line.audioUrl, line.snippetStart ?? 0)
  }
}

export async function loadAuthorSlides(authorProfileId: string): Promise<StorySlide[]> {
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('stories')
    .select('id, author_profile_id, post_id, expires_at, created_at')
    .eq('author_profile_id', authorProfileId)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: true })

  if (error) throw error

  const rows: StoryRow[] = (data || []).map((r) => ({
    id: String(r.id),
    authorProfileId: String(r.author_profile_id),
    postId: String(r.post_id),
    expiresAt: String(r.expires_at),
    createdAt: String(r.created_at),
  }))

  const moments = await Promise.all(rows.map((story) => loadStoryMoment(story.postId)))
  const slides: StorySlide[] = []
  rows.forEach((story, i) => {
    const moment = moments[i]
    if (moment) slides.push({ story, moment })
  })
  prefetchSlideAssets(slides)
  return slides
}
