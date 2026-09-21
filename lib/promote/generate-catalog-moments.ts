import {
  type CatalogLyricAtom,
} from '@/lib/catalog-lyric-unit'
import {
  applyGenerateDedupTiers,
  type DedupTierResult,
} from '@/lib/promote/generate-dedup'
import {
  buildMomentFromCandidate,
  fillMomentsFromEligible,
  pickNonOverlappingWindows,
} from '@/lib/promote/generate-fill-moments'
import {
  MOOD_EFFECT_PROMPT_RULES,
  PROMOTE_MOODS,
} from '@/lib/promote/mood-effect-map'
import {
  flattenExcludedLineIndexes,
  isFillerLineText,
  resolveModelWindowToEligible,
} from '@/lib/promote/resolve-generate-window'
import type {
  GeneratePromoteMode,
  GenerateWindowCandidate,
  ModelGenerateWindow,
  ResolvedGenerateMoment,
} from '@/lib/promote/generate-types'

export type {
  GeneratePromoteMode,
  GenerateWindowCandidate,
  ModelGenerateWindow,
  ResolvedGenerateMoment,
} from '@/lib/promote/generate-types'

/** All contiguous 1–3 line windows for dedup + model context. */
export function buildGenerateWindowCandidates(
  songLines: CatalogLyricAtom[],
): GenerateWindowCandidate[] {
  const sorted = [...songLines].sort((a, b) => a.lineIndex - b.lineIndex)
  const out: GenerateWindowCandidate[] = []

  for (let i = 0; i < sorted.length; i++) {
    for (let len = 1; len <= 3 && i + len <= sorted.length; len++) {
      const slice = sorted.slice(i, i + len)
      if (slice.some((a) => isFillerLineText(a.text))) continue
      if (slice.length > 1) {
        let contiguous = true
        for (let j = 1; j < slice.length; j++) {
          if (slice[j].lineIndex !== slice[j - 1].lineIndex + 1) {
            contiguous = false
            break
          }
        }
        if (!contiguous) continue
      }
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

async function callGeneratePicker(params: {
  songTitle: string
  artistName: string
  count: number
  mode: GeneratePromoteMode
  directive?: string
  numberedLines: string
  eligibleSummary: string
  dedupMeta: DedupTierResult
  forbiddenLineIndexes: number[]
}): Promise<ModelGenerateWindow[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI not configured')
  }

  const directiveBlock = params.mode === 'directive' && params.directive
    ? `Artist directive (natural language — interpret intent broadly, do NOT require formal mood words):
"${params.directive}"
Read this as what the artist wants to say or do (congratulate someone, diss a rival, confess love, flex success, etc.).
Find lines whose meaning matches that intent. Then assign the closest mood tag from the list for visual styling.`
    : null

  const system = `You pick promotable lyric Moments for Margo YouTube Shorts.

Mood tags (assign one per window AFTER you choose lines — for visual styling only):
${PROMOTE_MOODS.join(', ')}
${MOOD_EFFECT_PROMPT_RULES}

Rules:
- Return exactly ${params.count} window(s) in JSON.
- Each window is 1–3 contiguous lines using the numbered line indexes shown in brackets (e.g. [12] means startLineIndex 12).
- Prefer hooky, quotable, emotionally clear lines — skip filler/interjections.
- Windows in one response must not share any line index.
- Pick ONLY from the eligible windows list (exact startLineIndex/endLineIndex pairs).
- Do not reuse any line index listed under forbidden indexes.
- Reply with valid JSON only: {"windows":[{"startLineIndex":0,"endLineIndex":1,"mood":"HOPE","reason":"..."}]}`

  const forbiddenBlock = params.forbiddenLineIndexes.length
    ? `Forbidden line indexes (do not use any window containing these): ${params.forbiddenLineIndexes.join(', ')}`
    : null

  const userParts = [
    `Song: "${params.songTitle}" by ${params.artistName}`,
    `Mode: ${params.mode}`,
    directiveBlock,
    `Pick exactly ${params.count} non-overlapping window(s). Dedup tier: ${params.dedupMeta.tier}.`,
    forbiddenBlock,
    '',
    'Full lyrics (numbered by line index):',
    params.numberedLines,
    '',
    'Eligible windows — use these exact startLineIndex/endLineIndex pairs only:',
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
      temperature: params.mode === 'directive' ? 0.55 : 0.45,
      max_tokens: params.count >= 3 ? 1200 : 900,
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

  if (eligible.length === 0) {
    throw new Error('No lyric windows remain after dedup cooldown.')
  }

  const numberedLines = params.songLines
    .slice()
    .sort((a, b) => a.lineIndex - b.lineIndex)
    .map((l) => `[${l.lineIndex}] ${l.text}`)
    .join('\n')

  const eligibleSummary = eligible
    .map((w) => `startLineIndex=${w.startLineIndex}, endLineIndex=${w.endLineIndex}: ${w.text.replace(/\n/g, ' / ')}`)
    .join('\n')

  const forbiddenLineIndexes = flattenExcludedLineIndexes(dedupMeta.excludedRanges)

  const serverWindows = pickNonOverlappingWindows(eligible, count)
  if (serverWindows.length === 0) {
    throw new Error('No promotable lyric windows remain for this song.')
  }

  let modelWindows: ModelGenerateWindow[] = []
  try {
    modelWindows = await callGeneratePicker({
      songTitle: params.songTitle,
      artistName: params.artistName,
      count,
      mode: params.mode,
      directive: params.directive,
      numberedLines,
      eligibleSummary,
      dedupMeta,
      forbiddenLineIndexes,
    })
  } catch {
    modelWindows = []
  }

  const modelByKey = new Map<string, ModelGenerateWindow>()
  for (const pick of modelWindows) {
    const candidate = resolveModelWindowToEligible(pick, params.songLines, eligible)
    if (!candidate) continue
    modelByKey.set(`${candidate.startLineIndex}:${candidate.endLineIndex}`, pick)
  }

  const resolved: ResolvedGenerateMoment[] = []
  for (const candidate of serverWindows) {
    const key = `${candidate.startLineIndex}:${candidate.endLineIndex}`
    const modelPick = modelByKey.get(key)
    const moment = buildMomentFromCandidate({
      candidate,
      songLines: params.songLines,
      mood: null,
      modelMood: modelPick?.mood || 'HOPE',
      reason: modelPick?.reason?.trim() || 'Selected for promotion.',
      mode: params.mode,
      directive: params.directive,
      dedupMeta: {
        tier: dedupMeta.tier,
        excludedRanges: dedupMeta.excludedRanges,
        poolSizeAfterFilter: dedupMeta.poolSizeAfterFilter,
      },
      unmappedMood: !modelPick?.mood,
    })
    if (moment) {
      if (modelPick) {
        moment.selectionReason.pickedByModel = true
      } else {
        moment.selectionReason.pickedByServer = true
      }
      resolved.push(moment)
    }
  }

  if (resolved.length < count) {
    const topped = fillMomentsFromEligible({
      eligible,
      alreadyResolved: resolved,
      count,
      songLines: params.songLines,
      mode: params.mode,
      directive: params.directive,
      dedupMeta,
      reasonPrefix: 'Server filled remaining slots from eligible pool.',
    })
    return { moments: topped, dedupMeta }
  }

  return { moments: resolved.slice(0, count), dedupMeta }
}
