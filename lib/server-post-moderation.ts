import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function writeFlagCount(postId: string): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin()
      .from('posts')
      .update({ flag_count: 10 })
      .eq('id', postId)
    if (error) {
      console.error('[server-post-moderation] flag_count failed:', error.message, { postId })
    }
  } catch (e) {
    console.error('[server-post-moderation] flag_count failed:', e)
  }
}

/** OpenAI moderation for owner content on write paths (Lyric Back PATCH). */
export async function moderateOwnedPostText(opts: {
  text: string
  postId: string
  authorId: string
}): Promise<{ flagged: boolean }> {
  const { text, postId, authorId } = opts
  if (!text.trim()) return { flagged: false }

  const admin = getSupabaseAdmin()
  const { data: post } = await admin
    .from('posts')
    .select('author_profile_id')
    .eq('id', postId)
    .maybeSingle()
  if (!post || post.author_profile_id !== authorId) {
    return { flagged: false }
  }

  if (!process.env.OPENAI_API_KEY) return { flagged: false }

  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text }),
    })
    if (!res.ok) return { flagged: false }
    const data = await res.json()
    const flagged = Boolean(data.results?.[0]?.flagged)
    if (flagged) await writeFlagCount(postId)
    return { flagged }
  } catch (err) {
    console.error('[server-post-moderation] OpenAI failed:', err)
    return { flagged: false }
  }
}
