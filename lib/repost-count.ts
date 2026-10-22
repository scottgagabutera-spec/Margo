/** Display math for the Repost badge. The table stays post_replays. */

export const REPLAYED_STORAGE_KEY = 'margoReplayed'

export type ReplayWriteKind = 'insert' | 'delete' | 'quote'

export type ReplayCountPending = {
  base: number
  delta: 1 | -1
  settled: boolean
  /** Distinguishes this write from a later one on the same post. */
  gen: number
}

export function visibleReplayCount(
  server: number | undefined,
  pending: ReplayCountPending | undefined,
  fallback = 0,
): number {
  if (pending) return Math.max(0, pending.base + pending.delta)
  if (typeof server === 'number' && Number.isFinite(server)) return Math.max(0, server)
  return Math.max(0, fallback || 0)
}

/**
 * Drop a settled override once post_stats has caught the expected count.
 * An in-flight write (settled: false) keeps the optimistic badge so a stale
 * snapshot cannot flash the old number.
 */
export function pendingAfterServer(
  pending: ReplayCountPending | undefined,
  server: number | undefined,
): ReplayCountPending | undefined {
  if (!pending) return undefined
  if (!pending.settled) return pending
  if (typeof server !== 'number' || !Number.isFinite(server)) return pending
  const expected = Math.max(0, pending.base + pending.delta)
  if (pending.delta > 0 && server >= expected) return undefined
  if (pending.delta < 0 && server <= expected) return undefined
  return pending
}

export function reconcileReplayPending(
  pending: Record<string, ReplayCountPending>,
  serverById: Record<string, number | undefined>,
): Record<string, ReplayCountPending> {
  let changed = false
  const next: Record<string, ReplayCountPending> = { ...pending }
  for (const id of Object.keys(next)) {
    const row = next[id]
    const kept = pendingAfterServer(row, serverById[id])
    if (kept !== row) {
      changed = true
      if (kept) next[id] = kept
      else delete next[id]
    }
  }
  return changed ? next : pending
}

export function tryBeginReplayWrite(
  inFlight: Map<string, ReplayWriteKind>,
  postId: string,
  kind: ReplayWriteKind,
): boolean {
  if (inFlight.has(postId)) return false
  inFlight.set(postId, kind)
  return true
}

export function endReplayWrite(inFlight: Map<string, ReplayWriteKind>, postId: string): void {
  inFlight.delete(postId)
}

/** Keep optimistic membership when a reload lands during a write. */
export function mergeLoadedReplays(
  loaded: Iterable<string>,
  inFlight: ReadonlyMap<string, ReplayWriteKind>,
): Set<string> {
  const next = new Set(loaded)
  for (const [id, kind] of inFlight) {
    if (kind === 'delete') next.delete(id)
    else next.add(id)
  }
  return next
}

/**
 * Apply a post_replays select that may have started before a local write.
 * Decisions stamped at or after `started` win over the select.
 */
export function applyLoadedMembership(
  loaded: Iterable<string>,
  inFlight: ReadonlyMap<string, ReplayWriteKind>,
  decidedAt: ReadonlyMap<string, number>,
  current: ReadonlySet<string>,
  started: number,
): { ids: Set<string>; dropDecided: string[] } {
  const ids = mergeLoadedReplays(loaded, inFlight)
  const dropDecided: string[] = []
  for (const [id, at] of decidedAt) {
    if (at >= started) {
      if (current.has(id)) ids.add(id)
      else ids.delete(id)
    } else {
      dropDecided.push(id)
    }
  }
  return { ids, dropDecided }
}

export function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as { code?: string }).code === '23505'
}

export function readReplayedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const saved = localStorage.getItem(REPLAYED_STORAGE_KEY)
    if (!saved) return new Set()
    const parsed = JSON.parse(saved) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

export function writeReplayedIds(ids: Iterable<string>): void {
  try {
    localStorage.setItem(REPLAYED_STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // Private mode and quota failures must not block the write.
  }
}
