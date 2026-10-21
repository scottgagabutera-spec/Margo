import { computePlaybackSegments } from '../moment/playback-segments.ts'
import type { CuratedMomentDraft, CuratedMomentStored, SongLyricLineInput } from './curated-types.ts'

const FILLER_RE = /^(hmm+|yeah+|oh+|ei+|la+|na+|woo+|ayy*|uh+|mm+)[.!?,]*$/i

function isFillerLineText(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (t.length <= 2) return true
  return FILLER_RE.test(t)
}

export const MIN_MOMENT_WORDS = 5
export const MIN_MOMENT_DURATION_SEC = 6
export const MAX_MOMENT_DURATION_SEC = 35
export const MIN_LINES_PER_MOMENT = 2
export const MAX_LINES_PER_MOMENT = 8

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function isLikelyFragment(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (wordCount(t) < MIN_MOMENT_WORDS) return true
  if (/[.!?…"')\]]$/.test(t)) return false
  return /\b(and|but|or|then|when|because|if|so|to|in|on|at|the|a|I|you|we|they|he|she|it|went|go|going)\s*$/i.test(t)
}

function lineByIndex(lines: SongLyricLineInput[], lineIndex: number): SongLyricLineInput | undefined {
  return lines.find((l) => l.lineIndex === lineIndex)
}

function assembleText(lines: SongLyricLineInput[], indexes: number[]): string {
  return indexes
    .map((idx) => lineByIndex(lines, idx)?.text.trim() ?? '')
    .filter(Boolean)
    .join('\n')
}

function indexesContiguous(indexes: number[]): boolean {
  if (indexes.length === 0) return false
  const sorted = [...indexes].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false
  }
  return true
}

function overlapRatio(a: number[], b: number[]): number {
  const setA = new Set(a)
  let shared = 0
  for (const x of b) if (setA.has(x)) shared++
  const denom = Math.min(a.length, b.length)
  return denom === 0 ? 0 : shared / denom
}

export type ValidateCuratedOptions = {
  minMoments?: number
  maxMoments?: number
}

export function validateCuratedMoments(
  drafts: CuratedMomentDraft[],
  songLines: SongLyricLineInput[],
  options?: ValidateCuratedOptions,
): { ok: true; moments: CuratedMomentStored[] } | { ok: false; reason: string } {
  const minMoments = options?.minMoments ?? 1
  const maxMoments = options?.maxMoments ?? 8
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return { ok: false, reason: 'No moments returned' }
  }
  if (drafts.length > maxMoments) {
    return { ok: false, reason: 'Too many moments' }
  }

  const accepted: CuratedMomentStored[] = []

  for (const draft of drafts) {
    let start = Number(draft.startLineIndex)
    let end = Number(draft.endLineIndex)
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return { ok: false, reason: 'Invalid line indexes' }
    }
    if (end < start) [start, end] = [end, start]

    const count = end - start + 1
    if (count < MIN_LINES_PER_MOMENT || count > MAX_LINES_PER_MOMENT) {
      return { ok: false, reason: 'Line span out of allowed range' }
    }

    const lineIndexes: number[] = []
    for (let i = start; i <= end; i++) lineIndexes.push(i)

    if (!indexesContiguous(lineIndexes)) {
      return { ok: false, reason: 'Non-contiguous indexes' }
    }

    for (const idx of lineIndexes) {
      const row = lineByIndex(songLines, idx)
      if (!row) return { ok: false, reason: `Missing line index ${idx}` }
      if (isFillerLineText(row.text)) {
        return { ok: false, reason: 'Filler line in range' }
      }
    }

    const text = assembleText(songLines, lineIndexes)
    if (wordCount(text) < MIN_MOMENT_WORDS) {
      return { ok: false, reason: 'Too few words' }
    }
    if (isLikelyFragment(text)) {
      return { ok: false, reason: 'Likely fragment' }
    }

    const reason = (draft.reason || '').trim()
    if (!reason || reason.length > 120) {
      return { ok: false, reason: 'Invalid reason' }
    }

    const segmentInputs = lineIndexes.map((lineIndex) => {
      const row = lineByIndex(songLines, lineIndex)!
      return {
        position: lineIndex,
        songId: 'song',
        snippetStart: row.startSec,
        snippetEnd: row.endSec,
      }
    })
    const segments = computePlaybackSegments(segmentInputs)
    if (segments.length === 0) {
      return { ok: false, reason: 'No playable segments' }
    }
    const startSec = segments[0].startSec
    const endSec = segments[segments.length - 1].endSec
    const duration = endSec - startSec
    if (duration < MIN_MOMENT_DURATION_SEC || duration > MAX_MOMENT_DURATION_SEC) {
      return { ok: false, reason: 'Duration out of range' }
    }

    const primaryVibe = (draft.primaryVibe || '').trim().toUpperCase()
    const confidence = Number(draft.confidence)
    if (!primaryVibe) return { ok: false, reason: 'Missing vibe' }
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      return { ok: false, reason: 'Invalid confidence' }
    }

    accepted.push({
      startLineIndex: start,
      endLineIndex: end,
      lineIndexes,
      text,
      reason,
      primaryVibe,
      confidence,
      startSec,
      endSec,
    })
  }

  for (let i = 0; i < accepted.length; i++) {
    for (let j = i + 1; j < accepted.length; j++) {
      const ratio = overlapRatio(accepted[i].lineIndexes, accepted[j].lineIndexes)
      if (ratio >= 0.5) {
        return { ok: false, reason: 'Heavy overlap between moments' }
      }
      const keyA = `${accepted[i].startLineIndex}_${accepted[i].endLineIndex}`
      const keyB = `${accepted[j].startLineIndex}_${accepted[j].endLineIndex}`
      if (keyA === keyB) return { ok: false, reason: 'Duplicate moment' }
    }
  }

  if (accepted.length < minMoments) {
    return { ok: false, reason: 'Not enough valid moments' }
  }

  accepted.sort((a, b) => a.startLineIndex - b.startLineIndex)
  return { ok: true, moments: accepted }
}
