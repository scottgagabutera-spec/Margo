import type { PromoteQueueStatus, PromoteTargetStatus } from '@/lib/promote/types'

type TargetStatusRow = { status: PromoteTargetStatus | string }

/** Derive aggregate queue status after platform publish attempts. */
export function resolveQueueStatusFromTargets(targets: TargetStatusRow[]): PromoteQueueStatus {
  const statuses = targets.map((t) => t.status)
  const published = statuses.filter((s) => s === 'published').length
  const failed = statuses.filter((s) => s === 'failed').length
  const skipped = statuses.filter((s) => s === 'skipped').length
  const actionable = statuses.length - skipped

  if (actionable === 0) return 'failed'
  if (published === actionable) return 'published'
  if (published > 0 && (failed > 0 || skipped > 0)) return 'partial'
  if (published > 0) return 'published'
  return 'failed'
}
