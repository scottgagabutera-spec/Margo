import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { consumeDailyApiRateLimit } from '@/lib/api-rate-limit-daily'
import { improveMemoryText, moderateMemoryText } from '@/lib/memory-ai/openai-memory'

export const runtime = 'nodejs'

const DAILY_LIMIT = 20

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: { field?: 'story' | 'title'; text?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const field = body.field === 'title' ? 'title' : body.field === 'story' ? 'story' : null
  const text = (body.text || '').trim()
  if (!field || !text) return NextResponse.json({ error: 'field and text required' }, { status: 400 })
  if (text.length > 500) return NextResponse.json({ error: 'Text too long' }, { status: 400 })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI help is unavailable right now. You can still post without it.' }, { status: 503 })
  }

  const limited = await consumeDailyApiRateLimit({
    route: 'memory-ai',
    bucket: user.id,
    limit: DAILY_LIMIT,
    failOpenOnDbError: true,
  })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Daily AI limit reached. Try again tomorrow or post without AI.' },
      { status: 429 },
    )
  }

  const safe = await moderateMemoryText(text)
  if (!safe) return NextResponse.json({ error: 'This text cannot be processed.' }, { status: 400 })

  const suggestion = await improveMemoryText(field, text)
  if (!suggestion) {
    return NextResponse.json({ error: 'AI help is unavailable right now. You can still post without it.' }, { status: 503 })
  }

  return NextResponse.json({ suggestion: field === 'title' ? suggestion.slice(0, 80) : suggestion.slice(0, 500) })
}
