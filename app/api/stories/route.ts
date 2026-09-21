import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { storyExpiresAt } from '@/lib/stories/types'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  let body: { postId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const postId = typeof body.postId === 'string' ? body.postId.trim() : ''
  if (!postId) {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 })
  }

  const expiresAt = storyExpiresAt()

  const { data: existing } = await supabase
    .from('stories')
    .select('id')
    .eq('author_profile_id', user.id)
    .eq('post_id', postId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existing?.id) {
    return NextResponse.json({ ok: true, storyId: existing.id, alreadyActive: true })
  }

  const { data, error } = await supabase
    .from('stories')
    .insert({
      author_profile_id: user.id,
      post_id: postId,
      expires_at: expiresAt,
    })
    .select('id, expires_at, created_at')
    .single()

  if (error) {
    const message = error.message.includes('can_reference_story_post')
      ? 'This Moment cannot be added to your Story'
      : error.message
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    storyId: data.id,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  })
}
