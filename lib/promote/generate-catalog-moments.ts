import {
  assembleCatalogUnitFromRange,
  type CatalogLyricAtom,
} from '@/lib/catalog-lyric-unit'
import {
  applyGenerateDedupTiers,
  windowsOverlap,
  type DedupTierResult,
} from '@/lib/promote/generate-dedup'
import {
  MOOD_EFFECT_PROMPT_RULES,
  PROMOTE_MOODS,
  resolveMoodEffect,
  type PromoteMood,
} from '@/lib/promote/mood-effect-map'

export type GeneratePromoteMode = 'auto' | 'directive'

export interface GenerateWindowCandidate {
  startLineIndex: number
  endLineIndex: number
  lineIndexes: number[]
  text: string
}

export interface ModelGenerateWindow {
  startLineIndex: number
  endLineIndex: number
  mood: string
  reason: string
}

export interface ResolvedGenerateMoment {
  startLineIndex: number
  endLineIndex: number
  lineIndexes: number[]
  lyricText: string
  snippetStartSec: number
  snippetEndSec: number
  mood: PromoteMood | null
  reason: string
  atmosphereId: string
  themeId: string
  selectionScore: number
  selectionReason: Record<string, unknown>
}

const FILLER_RE = /^(hmm+|yeah+|oh+|ei+|la+|na+|woo+|ayy*|uh+|mm+)[.!?,]*$/i

function isFillerLine(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (t.length <= 2) return true
  return FILLER_RE.test(t)
}

/** All contiguous 1–3 line windows for dedup + model context. */
export function buildGenerateWindowCandidates(
  songLines: CatalogLyricAtom[],
): GenerateWindowCandidate[] {
  const sorted = [...songLines].sort((a, b) => a.lineIndex - b.lineIndex)
  const out: GenerateWindowCandidate[] = []

  for (let i = 0; i < sorted.length; i++) {
    for (let len = 1; len <= 3 && i + len <= sorted.length; len++) {
      const slice = sorted.slice(i, i + len)
      if (slice.some((a) => isFillerLine(a.text))) continue
      const joined = slice.map((a) => a.text.trim()).filter(Boolean).join('\n')
      if (!joined.trim()) continue
      out.push({
        startLineIndex: slice[0].lineIndex,
        endLineIndex: slice[slice.length - 1].lineIndex,
        lineIndexes: slice.map((a) => a.lineIndex),
        text: joined,
      })
    }
  }

  return out
}

function scoreWindow(text: string, reason: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  let score = Math.min(words, 24) / 24
  if (text.includes('\n')) score += 0.08
  if (reason.length > 40) score += 0.05
  return Math.min(1, Math.round(score * 100) / 100)
}

async function callGeneratePicker(params: {
  songTitle: string
  artistName: string
  count: number
  mode: GeneratePromoteMode
  directive?: string
  numberedLines: string
  eligibleSummary: string
  dedupMeta: DedupTierResult
}): Promise<ModelGenerateWindow[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI not configured')
  }

  const system = `You pick promotable lyric Moments for Margo YouTube Shorts.
Moods (one per window, from this list only): ${PROMOTE_MOODS.join(', ')}.
${MOOD_EFFECT_PROMPT_RULES}

Rules:
- Return exactly ${params.count} window(s).
- Each window is 1–3 contiguous lines (inclusive indexes).
- Prefer hooky, quotable, emotionally clear lines — skip filler/interjections.
- Windows in one response must not share any line index.
- Choose only from eligible windows listed below (same indexes).
- Reply with valid JSON only: {"windows":[{"startLineIndex":0,"endLineIndex":1,"mood":"HOPE","reason":"..."}]}`

  const userParts = [
    `Song: "${params.songTitle}" by ${params.artistName}`,
    `Mode: ${params.mode}`,
    params.directive ? `Artist directive: ${params.directive}` : null,
    `Pick ${params.count} window(s). Dedup tier: ${params.dedupMeta.tier}.`,
    '',
    'Full lyrics (numbered):',
    params.numberedLines,
    '',
    'Eligible windows (pick from these indexes only):',
    params.eligibleSummary,
  ].filter(Boolean)

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.45,
      max_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userParts.join('\n') },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI picker failed: ${err.slice(0, 240)}`)
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content
  if (!raw) throw new Error('OpenAI returned empty picker response')

  let parsed: { windows?: ModelGenerateWindow[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('OpenAI picker returned invalid JSON')
  }

  if (!Array.isArray(parsed.windows) || parsed.windows.length === 0) {
    throw new Error('OpenAI picker returned no windows')
  }

  return parsed.windows
}

export async function generateCatalogMoments(params: {
  songTitle: string
  artistName: string
  songLines: CatalogLyricAtom[]
  count: number
  mode: GeneratePromoteMode
  directive?: string
  usedQueueRows: Array<{
    source_line_indexes: number[] | null
    selection_score: number | null
    created_at: string
  }>
}): Promise<{ moments: ResolvedGenerateMoment[]; dedupMeta: DedupTierResult }> {
  const count = Math.max(1, Math.min(3, params.count))
  const allCandidates = buildGenerateWindowCandidates(params.songLines)
  if (allCandidates.length === 0) {
    throw new Error('No eligible lyric windows found for this song.')
  }

  const { eligible, meta: dedupMeta } = applyGenerateDedupTiers(
    allCandidates,
    params.usedQueueRows,
  )

  const numberedLines = params.songLines
    .slice()
    .sort((a, b) => a.lineIndex - b.lineIndex)
    .map((l) => `[${l.lineIndex}] ${l.text}`)
    .join('\n')

  const eligibleSummary = eligible
    .map((w) => `[${w.startLineIndex}-${w.endLineIndex}] ${w.text.replace(/\n/g, ' / ')}`)
    .join('\n')

  const modelWindows = await callGeneratePicker({
    songTitle: params.songTitle,
    artistName: params.artistName,
    count,
    mode: params.mode,
    directive: params.directive,
    numberedLines,
    eligibleSummary,
    dedupMeta,
  })

  const eligibleByKey = new Map(
    eligible.map((w) => [`${w.startLineIndex}:${w.endLineIndex}`, w]),
  )

  const resolved: ResolvedGenerateMoment[] = []
  for (const pick of modelWindows) {
    if (resolved.length >= count) break
    const start = Number(pick.startLineIndex)
    const end = Number(pick.endLineIndex)
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue
    if (end - start + 1 < 1 || end - start + 1 > 3) continue

    const key = `${start}:${end}`
    const candidate = eligibleByKey.get(key)
    if (!candidate) continue
    if (resolved.some((r) => windowsOverlap(r.lineIndexes, candidate.lineIndexes))) continue

    const unit = assembleCatalogUnitFromRange(params.songLines, start, end)
    if (!unit) continue

    const mapped = resolveMoodEffect(pick.mood)
    const selectionScore = scoreWindow(unit.text, pick.reason || '')
    resolved.push({
      startLineIndex: start,
      endLineIndex: end,
      lineIndexes: unit.lineIndexes,
      lyricText: unit.text,
      snippetStartSec: unit.startSec,
      snippetEndSec: unit.endSec,
      mood: mapped.mood,
      reason: String(pick.reason || '').trim(),
      atmosphereId: mapped.atmosphereId,
      themeId: mapped.themeId,
      selectionScore,
      selectionReason: {
        mode: params.mode,
        directive: params.directive?.trim() || null,
        mood: mapped.mood,
        modelMood: pick.mood,
        model: 'gpt-4o-mini',
        reason: pick.reason,
        dedupTier: dedupMeta.tier,
        excludedRanges: dedupMeta.excludedRanges,
        poolSizeAfterFilter: dedupMeta.poolSizeAfterFilter,
        unmappedMood: mapped.unmappedMood,
        reusedRange: dedupMeta.tier === 'reuse',
      },
    })
  }

  if (resolved.length === 0) {
    throw new Error('Could not resolve any valid windows from the model response.')
  }

  return { moments: resolved, dedupMeta }
}
