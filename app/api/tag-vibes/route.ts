import { NextRequest, NextResponse } from 'next/server'

const VIBES = ['CHILL', 'HOPE', 'HEALING', 'GRATEFUL', 'SPIRITUAL', 'NOSTALGIA', 'JOY', 'LOVE', 'HYPE', 'PROUD']

function parseSRT(srt: string): { id: number; line: string; start: number; end: number }[] {
  const blocks = srt.trim().split(/\n\s*\n/)
  const lines: { id: number; line: string; start: number; end: number }[] = []
  blocks.forEach((block, i) => {
    const parts = block.trim().split('\n')
    if (parts.length < 3) return
    const match = parts[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    )
    if (!match) return
    const toSec = (h: string, m: string, s: string, ms: string) =>
      parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000
    lines.push({
      id: i,
      line: parts.slice(2).join(' ').trim(),
      start: toSec(match[1], match[2], match[3], match[4]),
      end: toSec(match[5], match[6], match[7], match[8]),
    })
  })
  return lines
}

export async function POST(request: NextRequest) {
  try {
    const { srt, songTitle, artist } = await request.json()
    if (!srt) return NextResponse.json({ error: 'srt required' }, { status: 400 })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 })

    const lines = parseSRT(srt)
    if (lines.length === 0) return NextResponse.json({ error: 'No lines parsed from SRT' }, { status: 400 })

    const numbered = lines.map(l => `[${l.id}] ${l.line}`).join('\n')

    const systemPrompt = `You are a music emotion tagger for Margo, a lyric-first music platform.
Available vibes: ${VIBES.join(', ')}
Rules:
- Tag each lyric line with 1-3 vibes from the list only
- A line can belong to multiple vibes
- Short filler lines like "Hmm", "Yeah", "Ei" get no tags — return empty array []
- Be generous — if a line could fit a vibe, include it
- Return ONLY valid JSON, no markdown, no explanation`

    const userPrompt = `Song: "${songTitle}" by ${artist}

Tag each line below with vibes from: ${VIBES.join(', ')}

${numbered}

Return JSON in this exact format:
{"tags": {"0": ["HOPE","HYPE"], "1": ["LOVE"], "2": [], ...}}
Every line index must be present. Empty array for filler lines.`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: 'GPT failed', detail: err }, { status: 500 })
    }

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''

    let parsed: { tags: Record<string, string[]> }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'GPT returned invalid JSON', raw }, { status: 500 })
    }

    const result = lines.map(l => ({
      id: l.id,
      line: l.line,
      start: l.start,
      end: l.end,
      vibes: (parsed.tags[String(l.id)] || []).filter((v: string) => VIBES.includes(v)),
    }))

    return NextResponse.json({ lines: result })
  } catch (err: any) {
    return NextResponse.json({ error: 'Tag vibes failed', detail: err.message }, { status: 500 })
  }
}
