import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { assertSongPipelineAccess } from '@/lib/song-pipeline-auth'

export const runtime = 'nodejs'
export const maxDuration = 120

const VIBES = ['CHILL', 'HOPE', 'HEALING', 'GRATEFUL', 'SPIRITUAL', 'NOSTALGIA', 'JOY', 'LOVE', 'HYPE', 'PROUD']

interface ParsedLine {
  id: number
  line: string
  start: number
  end: number
}

function parseSRT(srt: string): ParsedLine[] {
  const blocks = srt.trim().split(/\n\s*\n/)
  const lines: ParsedLine[] = []
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
    const { srt, songTitle, artist, songId } = await request.json()

    if (!srt) return NextResponse.json({ error: 'srt required' }, { status: 400 })
    if (!songId) return NextResponse.json({ error: 'songId required' }, { status: 400 })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 })

    const gate = await assertSongPipelineAccess(songId)
    if (!gate.ok) return gate.res

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

    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
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

    if (!gptRes.ok) {
      const err = await gptRes.json()
      return NextResponse.json({ error: 'GPT failed', detail: err }, { status: 500 })
    }

    const gptData = await gptRes.json()
    const raw = gptData.choices?.[0]?.message?.content?.trim() || ''

    let parsed: { tags: Record<string, string[]> }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'GPT returned invalid JSON', raw }, { status: 500 })
    }

    const taggedLines = lines.map(l => ({
      lineIndex: l.id,
      text: l.line,
      startSec: l.start,
      endSec: l.end,
      vibes: (parsed.tags[String(l.id)] || []).filter((v: string) => VIBES.includes(v)),
    }))

    // ── Persist to Supabase ──────────────────────────────────────────
    const supabase = getSupabaseAdmin()

    // Confirm the song actually exists before writing anything against it —
    // avoids silently creating orphaned lyric_lines for a bad songId.
    const { data: songRow, error: songLookupErr } = await supabase
      .from('songs')
      .select('id')
      .eq('id', songId)
      .single()

    if (songLookupErr || !songRow) {
      return NextResponse.json({ error: 'songId not found', detail: songLookupErr?.message }, { status: 404 })
    }

    // Re-processing support: wipe any existing lines for this song first.
    // lyric_line_vibes cascade-deletes (ON DELETE CASCADE). Saved playlists
    // in queue_items.lyric_line_id do not — snapshot line_index, detach, then
    // rematch after insert so regenerate is not blocked by NO ACTION FKs.
    const queuedSnippets = await snapshotQueueSnippets(supabase, songId)
    if (!queuedSnippets.ok) {
      return NextResponse.json({ error: 'Failed to detach playlist lines', detail: queuedSnippets.error }, { status: 500 })
    }

    const detachErr = await detachQueueSnippets(supabase, queuedSnippets.lineIds)
    if (detachErr) {
      return NextResponse.json({ error: 'Failed to detach playlist lines', detail: detachErr }, { status: 500 })
    }

    const { error: deleteErr } = await supabase
      .from('lyric_lines')
      .delete()
      .eq('song_id', songId)

    if (deleteErr) {
      return NextResponse.json({ error: 'Failed to clear existing lines', detail: deleteErr.message }, { status: 500 })
    }

    // Insert lyric_lines, get back generated ids matched to line_index
    const { data: insertedLines, error: insertLinesErr } = await supabase
      .from('lyric_lines')
      .insert(
        taggedLines.map(l => ({
          song_id: songId,
          line_index: l.lineIndex,
          text: l.text,
          start_sec: l.startSec,
          end_sec: l.endSec,
        }))
      )
      .select('id, line_index')

    if (insertLinesErr || !insertedLines) {
      return NextResponse.json({ error: 'Failed to insert lyric_lines', detail: insertLinesErr?.message }, { status: 500 })
    }

    // Map line_index -> generated line id, so vibes attach to the right row
    const lineIdByIndex = new Map(insertedLines.map(row => [row.line_index, row.id]))

    const vibeRows = taggedLines.flatMap(l => {
      const lineId = lineIdByIndex.get(l.lineIndex)
      if (!lineId) return []
      return l.vibes.map((vibe: string) => ({ line_id: lineId, vibe }))
    })

    if (vibeRows.length > 0) {
      const { error: insertVibesErr } = await supabase
        .from('lyric_line_vibes')
        .insert(vibeRows)

      if (insertVibesErr) {
        return NextResponse.json({ error: 'Failed to insert lyric_line_vibes', detail: insertVibesErr.message }, { status: 500 })
      }
    }

    const rematchErr = await rematchQueueSnippets(supabase, queuedSnippets.snippets, lineIdByIndex)
    if (rematchErr) {
      console.error('tag-vibes: playlist rematch failed after lyric rebuild', rematchErr)
    }

    return NextResponse.json({
      songId,
      linesWritten: insertedLines.length,
      vibesWritten: vibeRows.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Tag vibes failed', detail: err.message }, { status: 500 })
  }
}

type AdminClient = ReturnType<typeof getSupabaseAdmin>

type QueuedSnippet = {
  queue_id: string
  position: number
  line_index: number
}

async function snapshotQueueSnippets(
  supabase: AdminClient,
  songId: string,
): Promise<{ ok: true; snippets: QueuedSnippet[]; lineIds: string[] } | { ok: false; error: string }> {
  const { data: oldLines, error: oldErr } = await supabase
    .from('lyric_lines')
    .select('id, line_index')
    .eq('song_id', songId)
  if (oldErr) return { ok: false, error: oldErr.message }

  const lineIds = (oldLines ?? []).map((row) => row.id as string)
  if (lineIds.length === 0) return { ok: true, snippets: [], lineIds: [] }

  const indexById = new Map((oldLines ?? []).map((row) => [row.id as string, row.line_index as number]))
  const { data: queued, error: queuedErr } = await supabase
    .from('queue_items')
    .select('queue_id, position, lyric_line_id')
    .in('lyric_line_id', lineIds)
  if (queuedErr) return { ok: false, error: queuedErr.message }

  const snippets: QueuedSnippet[] = []
  for (const row of queued ?? []) {
    const lineIndex = indexById.get(row.lyric_line_id as string)
    if (lineIndex == null || !row.queue_id) continue
    snippets.push({
      queue_id: row.queue_id as string,
      position: row.position as number,
      line_index: lineIndex,
    })
  }
  return { ok: true, snippets, lineIds }
}

async function detachQueueSnippets(
  supabase: AdminClient,
  lineIds: string[],
): Promise<string | null> {
  if (lineIds.length === 0) return null
  const { error } = await supabase
    .from('queue_items')
    .update({ lyric_line_id: null })
    .in('lyric_line_id', lineIds)
  return error?.message ?? null
}

async function rematchQueueSnippets(
  supabase: AdminClient,
  snippets: QueuedSnippet[],
  lineIdByIndex: Map<number, string>,
): Promise<string | null> {
  for (const item of snippets) {
    const newId = lineIdByIndex.get(item.line_index)
    if (!newId) continue
    const { error } = await supabase
      .from('queue_items')
      .update({ lyric_line_id: newId })
      .eq('queue_id', item.queue_id)
      .eq('position', item.position)
    if (error) return error.message
  }
  return null
}