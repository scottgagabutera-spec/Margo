import type { SuggestedLyricBack } from '@/lib/suggest-lyric-back'

/** POST /api/suggest-lyric-back — on-demand when the Lyric Back panel opens. */
export async function fetchLyricBackSuggestionsForPost(
  postId: string,
): Promise<SuggestedLyricBack[]> {
  const res = await fetch('/api/suggest-lyric-back', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postIds: [postId] }),
  })
  const data = await res.json().catch(() => ({})) as {
    suggestions?: Record<string, SuggestedLyricBack[]>
    error?: string
  }
  if (!res.ok) {
    throw new Error(data.error || `Could not load suggestions (${res.status})`)
  }
  return (data.suggestions?.[postId] ?? []).slice(0, 3)
}
