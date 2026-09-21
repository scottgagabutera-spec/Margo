import {
  type CatalogLyricAtom,
} from '@/lib/catalog-lyric-unit'
import {
  applyGenerateDedupTiers,
  windowsOverlap,
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
  resolveModelWindowForSong,
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

/** Runaway guard only — not a quality bar. Auto returns however many strong moments the model finds up to this. */
export const AUTO_DISCOVERY_SAFETY_MAX = 15

const DIRECTIVE_MAX_MOMENTS = 3

/** All contiguous 1–3 line windows for dedup + directive eligible pool. */
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

async function callOpenAiPicker(
  system: string,
  user: string,
  maxTokens: number,
  temperature: number,
): Promise<ModelGenerateWindow[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI not configured')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
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

async function callAutoDiscoveryPicker(params: {
  songTitle: string
  artistName: string
  numberedLines: string
  dedupMeta: DedupTierResult
  forbiddenLineIndexes: number[]
}): Promise<ModelGenerateWindow[]> {
  const system = `You discover promotable lyric Moments for Margo YouTube Shorts.

Scan the ENTIRE song and return EVERY genuinely strong, distinct shareable moment you find.

Each moment is 1–3 contiguous lines — YOU choose the grouping per moment (single punchline, couplet, or 3-line thought).

Mood tags (one per moment, for visual styling only): ${PROMOTE_MOODS.join(', ')}
${MOOD_EFFECT_PROMPT_RULES}

Rules:
- Return ALL strong distinct moments — no fixed count.
- For a normal full-length song (chorus + verse + hook/turn), expect MULTIPLE moments (often 4–10+). A single moment is rare and only for genuinely sparse/interlude material.
- Do NOT be overly conservative. Include chorus hooks, standout verse lines, punchlines, and emotional turns when they work as standalone Shorts.
- Skip filler/interjections only (yeah, hmm, ad-libs with no substance).
- Moments must not share any line index.
- Use the numbered line indexes exactly as shown (e.g. [12] → startLineIndex 12).
- Do not use line indexes listed as forbidden.
- Include "strength" 1–5 per window (5 = essential hook). Order windows by strength descending.
- Reply with valid JSON only: {"windows":[{"startLineIndex":0,"endLineIndex":1,"mood":"HOPE","reason":"...","strength":5}]}`

  const forbiddenBlock = params.forbiddenLineIndexes.length
    ? `Forbidden line indexes (do not use any moment containing these): ${params.forbiddenLineIndexes.join(', ')}`
    : null

  const user = [
    `Song: "${params.songTitle}" by ${params.artistName}`,
    'Mode: auto (whole-song discovery — return every strong moment)',
    forbiddenBlock,
    `Dedup tier: ${params.dedupMeta.tier}.`,
    '',
    'Full lyrics (numbered by line index):',
    params.numberedLines,
  ].filter(Boolean).join('\n')

  return callOpenAiPicker(system, user, 3500, 0.5)
}

async function callDirectivePicker(params: {
  songTitle: string
  artistName: string
  count: number
  directive: string
  numberedLines: string
  eligibleSummary: string
  dedupMeta: DedupTierResult
  forbiddenLineIndexes: number[]
}): Promise<ModelGenerateWindow[]> {
  const system = `You pick promotable lyric Moments for Margo YouTube Shorts.

Mood tags (assign one per window AFTER you choose lines — for visual styling only):
${PROMOTE_MOODS.join(', ')}
${MOOD_EFFECT_PROMPT_RULES}

Rules:
- Return exactly ${params.count} window(s) in JSON.
- Each window is 1–3 contiguous lines using the numbered line indexes shown in brackets.
- Windows in one response must not share any line index.
- Pick ONLY from the eligible windows list (exact startLineIndex/endLineIndex pairs).
- Do not reuse any line index listed under forbidden indexes.
- Reply with valid JSON only: {"windows":[{"startLineIndex":0,"endLineIndex":1,"mood":"HOPE","reason":"..."}]}`

  const user = [
    `Song: "${params.songTitle}" by ${params.artistName}`,
    'Mode: directive',
    `Artist directive (natural language — interpret intent broadly, do NOT require formal mood words):
"${params.directive}"
Find lines whose meaning matches that intent. Then assign the closest mood tag for visual styling.`,
    `Pick exactly ${params.count} non-overlapping window(s). Dedup tier: ${params.dedupMeta.tier}.`,
    params.forbiddenLineIndexes.length
      ? `Forbidden line indexes: ${params.forbiddenLineIndexes.join(', ')}`
      : null,
    '',
    'Full lyrics (numbered by line index):',
    params.numberedLines,
    '',
    'Eligible windows — use these exact startLineIndex/endLineIndex pairs only:',
    params.eligibleSummary,
  ].filter(Boolean).join('\n')

  return callOpenAiPicker(system, user, params.count >= 3 ? 1200 : 900, 0.55)
}

function sortModelWindows(windows: ModelGenerateWindow[]): ModelGenerateWindow[] {
  return [...windows].sort((a, b) => {
    const sa = Number(a.strength)
    const sb = Number(b.strength)
    const aScore = Number.isFinite(sa) ? sa : 0
    const bScore = Number.isFinite(sb) ? sb : 0
    return bScore - aScore
  })
}

function resolveAutoMoments(params: {
  modelWindows: ModelGenerateWindow[]
  songLines: CatalogLyricAtom[]
  forbiddenLineIndexes: number[]
  dedupMeta: DedupTierResult
}): ResolvedGenerateMoment[] {
  const resolved: ResolvedGenerateMoment[] = []

  for (const pick of sortModelWindows(params.modelWindows)) {
    if (resolved.length >= AUTO_DISCOVERY_SAFETY_MAX) break

    const candidate = resolveModelWindowForSong(
      pick,
      params.songLines,
      params.forbiddenLineIndexes,
    )
    if (!candidate) continue
    if (resolved.some((r) => windowsOverlap(r.lineIndexes, candidate.lineIndexes))) continue

    const moment = buildMomentFromCandidate({
      candidate,
      songLines: params.songLines,
      mood: null,
      modelMood: pick.mood,
      reason: String(pick.reason || '').trim(),
      mode: 'auto',
      dedupMeta: {
        tier: params.dedupMeta.tier,
        excludedRanges: params.dedupMeta.excludedRanges,
        poolSizeAfterFilter: params.dedupMeta.poolSizeAfterFilter,
      },
      unmappedMood: false,
    })
    if (!moment) continue

    moment.selectionScore = Number.isFinite(Number(pick.strength))
      ? Math.min(1, Number(pick.strength) / 5)
      : moment.selectionScore
    moment.selectionReason.pickedByModel = true
    moment.selectionReason.modelStrength = pick.strength ?? null
    moment.selectionReason.discoveryMode = 'auto_whole_song'
    resolved.push(moment)
  }

  return resolved
}

async function generateAutoCatalogMoments(params: {
  songTitle: string
  artistName: string
  songLines: CatalogLyricAtom[]
  usedQueueRows: Array<{
    source_line_indexes: number[] | null
    selection_score: number | null
    created_at: string
  }>
}): Promise<{ moments: ResolvedGenerateMoment[]; dedupMeta: DedupTierResult }> {
  const allCandidates = buildGenerateWindowCandidates(params.songLines)
  if (allCandidates.length === 0) {
    throw new Error('No eligible lyric windows found for this song.')
  }

  const { meta: dedupMeta } = applyGenerateDedupTiers(allCandidates, params.usedQueueRows)
  const forbiddenLineIndexes = flattenExcludedLineIndexes(dedupMeta.excludedRanges)

  const numberedLines = params.songLines
    .slice()
    .sort((a, b) => a.lineIndex - b.lineIndex)
    .map((l) => `[${l.lineIndex}] ${l.text}`)
    .join('\n')

  const modelWindows = await callAutoDiscoveryPicker({
    songTitle: params.songTitle,
    artistName: params.artistName,
    numberedLines,
    dedupMeta,
    forbiddenLineIndexes,
  })

  const moments = resolveAutoMoments({
    modelWindows,
    songLines: params.songLines,
    forbiddenLineIndexes,
    dedupMeta,
  })

  if (moments.length === 0) {
    throw new Error('No strong promotable moments found — try Directive mode or Manual.')
  }

  return { moments, dedupMeta }
}

async function generateDirectiveCatalogMoments(params: {
  songTitle: string
  artistName: string
  songLines: CatalogLyricAtom[]
  count: number
  directive: string
  usedQueueRows: Array<{
    source_line_indexes: number[] | null
    selection_score: number | null
    created_at: string
  }>
}): Promise<{ moments: ResolvedGenerateMoment[]; dedupMeta: DedupTierResult }> {
  const count = Math.max(1, Math.min(DIRECTIVE_MAX_MOMENTS, params.count))
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
    modelWindows = await callDirectivePicker({
      songTitle: params.songTitle,
      artistName: params.artistName,
      count,
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
      mode: 'directive',
      directive: params.directive,
      dedupMeta: {
        tier: dedupMeta.tier,
        excludedRanges: dedupMeta.excludedRanges,
        poolSizeAfterFilter: dedupMeta.poolSizeAfterFilter,
      },
      unmappedMood: !modelPick?.mood,
    })
    if (moment) {
      moment.selectionReason.pickedByModel = !!modelPick
      moment.selectionReason.pickedByServer = !modelPick
      moment.selectionReason.discoveryMode = 'directive_counted'
      resolved.push(moment)
    }
  }

  if (resolved.length < count) {
    return {
      moments: fillMomentsFromEligible({
        eligible,
        alreadyResolved: resolved,
        count,
        songLines: params.songLines,
        mode: 'directive',
        directive: params.directive,
        dedupMeta,
        reasonPrefix: 'Server filled remaining slots from eligible pool.',
      }),
      dedupMeta,
    }
  }

  return { moments: resolved.slice(0, count), dedupMeta }
}

export async function generateCatalogMoments(params: {
  songTitle: string
  artistName: string
  songLines: CatalogLyricAtom[]
  count?: number
  mode: GeneratePromoteMode
  directive?: string
  usedQueueRows: Array<{
    source_line_indexes: number[] | null
    selection_score: number | null
    created_at: string
  }>
}): Promise<{ moments: ResolvedGenerateMoment[]; dedupMeta: DedupTierResult }> {
  if (params.mode === 'auto') {
    return generateAutoCatalogMoments(params)
  }

  if (!params.directive?.trim()) {
    throw new Error('directive is required in directive mode')
  }

  return generateDirectiveCatalogMoments({
    ...params,
    count: params.count ?? 1,
    directive: params.directive.trim(),
  })
}
