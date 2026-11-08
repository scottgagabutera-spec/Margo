import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { EchoSongPayload, EchoTimeChoice } from '@/lib/echoes/types'

const MAX_SONGS = 50
const TIME_CHOICES = new Set<EchoTimeChoice>([
  'today',
  'this_week',
  'last_week',
  'this_month',
  'this_year',
])

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  let body: { questionId?: string; timeChoice?: string; payload?: EchoSongPayload }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const questionId = body.questionId?.trim()
  const timeChoice = body.timeChoice?.trim() as EchoTimeChoice | undefined
  const payload = body.payload

  if (!questionId || !timeChoice || !TIME_CHOICES.has(timeChoice)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!payload?.songs?.length || payload.songs.length > MAX_SONGS) {
    return NextResponse.json({ error: 'Invalid songs' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: question } = await admin.from('echo_questions').select('id').eq('id', questionId).maybeSingle()
  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  const { error } = await admin.from('echo_answers').upsert(
    {
      question_id: questionId,
      profile_id: user.id,
      time_choice: timeChoice,
      payload,
    },
    { onConflict: 'question_id,profile_id' },
  )

  if (error) {
    console.error('[echoes/answers]', error)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
