import {
  assembleCatalogUnitFromRange,
  type CatalogLyricAtom,
} from '@/lib/catalog-lyric-unit'
import type { GenerateWindowCandidate, ModelGenerateWindow } from '@/lib/promote/generate-types'

const FILLER_RE = /^(hmm+|yeah+|oh+|ei+|la+|na+|woo+|ayy*|uh+|mm+)[.!?,]*$/i

export function isFillerLineText(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (t.length <= 2) return true
  return FILLER_RE.test(t)
}

function findEligibleMatch(
  eligible: GenerateWindowCandidate[],
  startLineIndex: number,
  endLineIndex: number,
): GenerateWindowCandidate | null {
  return eligible.find(
    (w) => w.startLineIndex === startLineIndex && w.endLineIndex === endLineIndex,
  ) ?? null
}

/** Map model indexes to an eligible window — tolerates line_index vs array-position drift. */
export function resolveModelWindowToEligible(
  pick: ModelGenerateWindow,
  songLines: CatalogLyricAtom[],
  eligible: GenerateWindowCandidate[],
): GenerateWindowCandidate | null {
  let start = Number(pick.startLineIndex)
  let end = Number(pick.endLineIndex)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (end < start) [start, end] = [end, start]

  const sorted = [...songLines].sort((a, b) => a.lineIndex - b.lineIndex)
  const lineIndexes = sorted.map((l) => l.lineIndex)
  const seen = new Set<string>()
  for (const attempt of indexAttempts(start, end, lineIndexes)) {
    const key = `${attempt.start}:${attempt.end}`
    if (seen.has(key)) continue
    seen.add(key)

    const direct = findEligibleMatch(eligible, attempt.start, attempt.end)
    if (direct) return direct

    const span = attempt.end - attempt.start + 1
    if (span < 1 || span > 3) continue

    const unit = assembleCatalogUnitFromRange(songLines, attempt.start, attempt.end)
    if (!unit) continue
    if (unit.atoms.some((a) => isFillerLineText(a.text))) continue

    const assembled = findEligibleMatch(eligible, unit.startLineIndex, unit.endLineIndex)
    if (assembled) return assembled
  }

  return null
}

function indexAttempts(
  start: number,
  end: number,
  lineIndexes: number[],
): Array<{ start: number; end: number }> {
  const attempts: Array<{ start: number; end: number }> = [{ start, end }]
  if (start >= 0 && end >= 0 && start < lineIndexes.length && end < lineIndexes.length) {
    attempts.push({ start: lineIndexes[start], end: lineIndexes[end] })
  }
  if (start >= 1 && end >= 1 && start <= lineIndexes.length && end <= lineIndexes.length) {
    attempts.push({ start: lineIndexes[start - 1], end: lineIndexes[end - 1] })
  }
  return attempts
}

export function rangeUsesForbiddenIndex(
  lineIndexes: number[],
  forbiddenLineIndexes: number[],
): boolean {
  if (forbiddenLineIndexes.length === 0) return false
  const forbidden = new Set(forbiddenLineIndexes)
  return lineIndexes.some((i) => forbidden.has(i))
}

/** Validate a model pick against song lines + dedup forbidden indexes (Auto discovery). */
export function resolveModelWindowForSong(
  pick: ModelGenerateWindow,
  songLines: CatalogLyricAtom[],
  forbiddenLineIndexes: number[],
): GenerateWindowCandidate | null {
  let start = Number(pick.startLineIndex)
  let end = Number(pick.endLineIndex)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (end < start) [start, end] = [end, start]

  const sorted = [...songLines].sort((a, b) => a.lineIndex - b.lineIndex)
  const lineIndexes = sorted.map((l) => l.lineIndex)
  const seen = new Set<string>()

  for (const attempt of indexAttempts(start, end, lineIndexes)) {
    const key = `${attempt.start}:${attempt.end}`
    if (seen.has(key)) continue
    seen.add(key)

    const span = attempt.end - attempt.start + 1
    if (span < 1 || span > 3) continue

    const unit = assembleCatalogUnitFromRange(songLines, attempt.start, attempt.end)
    if (!unit) continue
    if (unit.atoms.some((a) => isFillerLineText(a.text))) continue
    if (rangeUsesForbiddenIndex(unit.lineIndexes, forbiddenLineIndexes)) continue

    return {
      startLineIndex: unit.startLineIndex,
      endLineIndex: unit.endLineIndex,
      lineIndexes: unit.lineIndexes,
      text: unit.text,
    }
  }

  return null
}

export function flattenExcludedLineIndexes(excludedRanges: number[][]): number[] {
  const out = new Set<number>()
  for (const range of excludedRanges) {
    for (const idx of range) out.add(idx)
  }
  return [...out].sort((a, b) => a - b)
}
