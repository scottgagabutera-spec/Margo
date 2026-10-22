import { NextRequest, NextResponse } from 'next/server'
import { consumeHourlyApiRateLimit } from '@/lib/api-rate-limit'
import { getRequestClientIp, ipRateLimitBucket } from '@/lib/api-request-ip'

const VALID_VIBES = [
  'CHILL','HOPE','HEALING','GRATEFUL','SPIRITUAL','NOSTALGIA','JOY',
  'LOVE','HYPE','PROUD','HEARTBREAK','PAIN','LONELINESS','LOST',
  'RAGE','SENDIT','LETOUT'
]

const MAX_LYRIC_LEN = 500
const RATE_LIMIT_PER_HOUR = 60

export async function POST(request: NextRequest) {
  try {
    const bucket = ipRateLimitBucket(getRequestClientIp(request))
    const limited = await consumeHourlyApiRateLimit({
      route: 'emotion',
      bucket,
      limit: RATE_LIMIT_PER_HOUR,
      failOpenOnDbError: true,
    })
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } },
      )
    }

    const { lyric } = await request.json()
    if (!lyric) return NextResponse.json({ error: 'lyric required' }, { status: 400 })
    const text = typeof lyric === 'string' ? lyric.slice(0, MAX_LYRIC_LEN) : ''
    if (!text.trim()) return NextResponse.json({ error: 'lyric required' }, { status: 400 })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 })
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 10,
        messages: [
          {
            role: 'system',
            content: `You detect the emotion of song lyrics. Reply with exactly one word from this list only: CHILL, HOPE, HEALING, GRATEFUL, SPIRITUAL, NOSTALGIA, JOY, LOVE, HYPE, PROUD, HEARTBREAK, PAIN, LONELINESS, LOST, RAGE, SENDIT, LETOUT.
CHILL = relaxed, easy, unbothered.
HOPE = optimistic, looking forward.
HEALING = recovering, getting better.
GRATEFUL = thankful, appreciative.
SPIRITUAL = faith, God, purpose, soul.
NOSTALGIA = memories, longing for the past.
JOY = happiness, celebration.
LOVE = romantic or deep affection, center of all feeling.
HYPE = energy, excitement, big moments.
PROUD = achievement, accomplishment.
HEARTBREAK = romantic loss, broken heart.
PAIN = raw hurt, deeper suffering.
LONELINESS = isolation, feeling alone.
LOST = confusion, not knowing what to do.
RAGE = anger, fury.
SENDIT = pure energy, this goes hard, sending it.
LETOUT = venting, releasing what you've been holding.
No other words, no punctuation.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: 'OpenAI failed', detail: err }, { status: 500 })
    }
    const data = await res.json()
    const emotion = data.choices?.[0]?.message?.content?.trim().toUpperCase()
    if (!VALID_VIBES.includes(emotion)) return NextResponse.json({ emotion: null })
    return NextResponse.json({ emotion })
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Emotion detection failed', detail }, { status: 500 })
  }
}
