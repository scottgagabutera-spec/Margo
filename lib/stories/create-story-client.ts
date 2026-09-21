export async function createStoryFromPost(postId: string): Promise<{
  ok: boolean
  storyId?: string
  alreadyActive?: boolean
  error?: string
}> {
  const res = await fetch('/api/stories', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      ok: false,
      error: typeof body.error === 'string' ? body.error : 'Could not add to Story',
    }
  }
  return {
    ok: true,
    storyId: typeof body.storyId === 'string' ? body.storyId : undefined,
    alreadyActive: !!body.alreadyActive,
  }
}
