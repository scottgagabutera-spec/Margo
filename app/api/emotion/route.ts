import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { lyric } = await request.json()
    if (!lyric) return NextResponse.json({ error: 'lyric required' }, { status: 400 })
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
            content: 'You detect the emotion of song lyrics. Reply with exactly one word from this list only: LOVE, HEARTBREAK, HOPE, NOSTALGIA, HEALING, JOY, RAGE, LONELINESS, SENDIT, LETOUT. No other words, no punctuation.',
          },
          {
            role: 'user',
            content: lyric,
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
    const valid = ['LOVE','HEARTBREAK','HOPE','NOSTALGIA','HEALING','JOY','RAGE','LONELINESS','SENDIT','LETOUT']
    if (!valid.includes(emotion)) return NextResponse.json({ emotion: null })
    return NextResponse.json({ emotion })

  } catch (err: any) {
    return NextResponse.json({ error: 'Emotion detection failed', detail: err.message }, { status: 500 })
  }
}
