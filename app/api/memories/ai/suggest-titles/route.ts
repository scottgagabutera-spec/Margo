import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { consumeDailyApiRateLimit } from '@/lib/api-rate-limit-daily'
import { moderateMemoryText, suggestMemoryTitles } from '@/lib/memory-ai/openai-memory'

export const runtime = 'nodejs'

const DAILY_LIMIT = 20

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: { story?: string; songs?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const story = (body.story || '').trim().slice(0, 500)
  const songs = Array.isArray(body.songs) ? body.songs.map(String).slice(0, 10) : []
  if (!story && songs.length === 0) {
    return NextResponse.json({ error: 'Add a story or songs first' }, { status: 400 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI help is unavailable right now.' }, { status: 503 })
  }

  const limited = await consumeDailyApiRateLimit({
    route: 'memory-ai',
    bucket: user.id,
    limit: DAILY_LIMIT,
    failOpenOnDbError: true,
  })
  if (!limited.ok) {
    return NextResponse.json({ error: 'Daily AI limit reached. Try again tomorrow.' }, { status: 429 })
  }

  const checkText = story || songs.join(' ')
  const safe = await moderateMemoryText(checkText)
  if (!safe) return NextResponse.json({ error: 'This text cannot be processed.' }, { status: 400 })

  const titles = await suggestMemoryTitles({ story, songHints: songs })
  if (!titles.length) {
    return NextResponse.json({ error: 'Could not suggest titles right now.' }, { status: 503 })
  }

  return NextResponse.json({ titles: titles.map((t) => t.slice(0, 80)) })
}
