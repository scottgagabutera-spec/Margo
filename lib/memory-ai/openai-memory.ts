const MODEL = 'gpt-4o-mini'
const MAX_INPUT = 500

type ChatMessage = { role: 'system' | 'user'; content: string }

async function chatCompletion(messages: ChatMessage[], maxTokens: number): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      max_tokens: maxTokens,
      messages,
    }),
  })
  if (!res.ok) {
    console.error('[memory-ai] openai', res.status, await res.text().catch(() => ''))
    return null
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return data.choices?.[0]?.message?.content?.trim() || null
}

export async function moderateMemoryText(text: string): Promise<boolean> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return true
  const res = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'omni-moderation-latest', input: text.slice(0, MAX_INPUT) }),
  })
  if (!res.ok) return false
  const data = (await res.json()) as { results?: { flagged?: boolean }[] }
  return !data.results?.some((r) => r.flagged)
}

export async function improveMemoryText(field: 'story' | 'title', raw: string): Promise<string | null> {
  const text = raw.trim().slice(0, MAX_INPUT)
  if (!text) return null
  const system =
    field === 'title'
      ? 'Rewrite the memory title: same meaning and facts, same language as the user, max 80 characters, warm and personal. Never invent facts. Output only the title.'
      : 'Rewrite the memory story: same meaning and facts, same language as the user, clean grammar, warm personal voice. Never invent facts. Output only the rewritten story.'
  return chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: text },
    ],
    field === 'title' ? 120 : 520,
  )
}

export async function suggestMemoryTitles(opts: {
  story: string
  songHints: string[]
}): Promise<string[]> {
  const story = opts.story.trim().slice(0, MAX_INPUT)
  const songs = opts.songHints.filter(Boolean).slice(0, 5).join(', ')
  const user = [
    story ? `Story:\n${story}` : '',
    songs ? `Songs: ${songs}` : '',
  ].filter(Boolean).join('\n\n')
  if (!user) return []

  const out = await chatCompletion(
    [
      {
        role: 'system',
        content:
          'Propose exactly 3 short memory titles (max 80 chars each), same language as the input, no invented facts. Reply as JSON array of strings only.',
      },
      { role: 'user', content: user },
    ],
    200,
  )
  if (!out) return []
  try {
    const parsed = JSON.parse(out) as unknown
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3)
    }
  } catch {
    return out
      .split('\n')
      .map((l) => l.replace(/^\d+[.)]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3)
  }
  return []
}
