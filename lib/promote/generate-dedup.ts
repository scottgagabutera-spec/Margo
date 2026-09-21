export const GENERATE_COOLDOWN_STRICT_DAYS = 14
export const GENERATE_COOLDOWN_RELAX_DAYS = 7

export interface UsedCatalogRange {
  lineIndexes: number[]
  selectionScore: number | null
  createdAt: string
}

export interface DedupTierResult {
  tier: 'strict' | 'relaxed' | 'reuse'
  excludedRanges: number[][]
  poolSizeAfterFilter: number
}

function rangeKey(indexes: number[]): string {
  return indexes.join(',')
}

export function rangesShareIndex(a: number[], b: number[]): boolean {
  const set = new Set(a)
  return b.some((i) => set.has(i))
}

export function isExactRangeMatch(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

function cutoffIso(days: number, nowMs = Date.now()): string {
  return new Date(nowMs - days * 24 * 60 * 60 * 1000).toISOString()
}

export function loadUsedCatalogRanges(
  rows: Array<{ source_line_indexes: number[] | null; selection_score: number | null; created_at: string }>,
  days: number,
  nowMs = Date.now(),
): UsedCatalogRange[] {
  const cutoff = cutoffIso(days, nowMs)
  return rows
    .filter((r) => r.source_line_indexes?.length && r.created_at >= cutoff)
    .map((r) => ({
      lineIndexes: r.source_line_indexes as number[],
      selectionScore: r.selection_score != null ? Number(r.selection_score) : null,
      createdAt: r.created_at,
    }))
}

export function filterWindowsByDedup<T extends { lineIndexes: number[] }>(
  windows: T[],
  used: UsedCatalogRange[],
  mode: 'index_overlap' | 'exact_match',
): T[] {
  if (used.length === 0) return windows
  return windows.filter((window) => {
    return !used.some((entry) => {
      if (mode === 'exact_match') {
        return isExactRangeMatch(window.lineIndexes, entry.lineIndexes)
      }
      return rangesShareIndex(window.lineIndexes, entry.lineIndexes)
    })
  })
}

/** Apply 14d overlap → 7d exact → reuse-lowest-score tiers. */
export function applyGenerateDedupTiers<T extends { lineIndexes: number[] }>(
  allWindows: T[],
  usedRows: Array<{ source_line_indexes: number[] | null; selection_score: number | null; created_at: string }>,
  nowMs = Date.now(),
): { eligible: T[]; meta: DedupTierResult } {
  const strictUsed = loadUsedCatalogRanges(usedRows, GENERATE_COOLDOWN_STRICT_DAYS, nowMs)
  const strictExcluded = strictUsed.map((u) => u.lineIndexes)
  let eligible = filterWindowsByDedup(allWindows, strictUsed, 'index_overlap')
  if (eligible.length > 0) {
    return {
      eligible,
      meta: {
        tier: 'strict',
        excludedRanges: strictExcluded,
        poolSizeAfterFilter: eligible.length,
      },
    }
  }

  const relaxedUsed = loadUsedCatalogRanges(usedRows, GENERATE_COOLDOWN_RELAX_DAYS, nowMs)
  const relaxedExcluded = relaxedUsed.map((u) => u.lineIndexes)
  eligible = filterWindowsByDedup(allWindows, relaxedUsed, 'exact_match')
  if (eligible.length > 0) {
    return {
      eligible,
      meta: {
        tier: 'relaxed',
        excludedRanges: relaxedExcluded,
        poolSizeAfterFilter: eligible.length,
      },
    }
  }

  const reuseKeys = new Set<string>()
  const reusedScores = new Map<string, number>()
  for (const row of usedRows) {
    if (!row.source_line_indexes?.length) continue
    const key = rangeKey(row.source_line_indexes)
    reuseKeys.add(key)
    const score = row.selection_score != null ? Number(row.selection_score) : 0
    const prev = reusedScores.get(key)
    if (prev == null || score < prev) reusedScores.set(key, score)
  }

  const reuseEligible = allWindows.filter((w) => reuseKeys.has(rangeKey(w.lineIndexes)))
  reuseEligible.sort((a, b) => {
    const sa = reusedScores.get(rangeKey(a.lineIndexes)) ?? 0
    const sb = reusedScores.get(rangeKey(b.lineIndexes)) ?? 0
    return sa - sb
  })

  return {
    eligible: reuseEligible.length ? reuseEligible : allWindows,
    meta: {
      tier: 'reuse',
      excludedRanges: strictExcluded,
      poolSizeAfterFilter: reuseEligible.length || allWindows.length,
    },
  }
}

/** Windows chosen in one batch must not overlap each other. */
export function windowsOverlap(a: number[], b: number[]): boolean {
  return rangesShareIndex(a, b)
}
