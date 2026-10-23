export const POST_REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate', 'Other'] as const

export type PostReportReason = (typeof POST_REPORT_REASONS)[number]

export const MAX_POST_REPORT_NOTE = 300

const REASON_SET = new Set<string>(POST_REPORT_REASONS)

export function isPostReportReason(value: string): value is PostReportReason {
  return REASON_SET.has(value)
}

export function normalizePostReportNote(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  return trimmed.slice(0, MAX_POST_REPORT_NOTE)
}

export type ParsedPostReportBody =
  | { ok: true; postId: string; reason: PostReportReason; note: string | null }
  | { ok: false; error: string; status: 400 }

export function parsePostReportBody(body: unknown): ParsedPostReportBody {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body', status: 400 }
  }
  const postId = typeof (body as { postId?: unknown }).postId === 'string'
    ? (body as { postId: string }).postId.trim()
    : ''
  const reasonRaw = typeof (body as { reason?: unknown }).reason === 'string'
    ? (body as { reason: string }).reason.trim()
    : ''
  if (!postId) return { ok: false, error: 'postId required', status: 400 }
  if (!isPostReportReason(reasonRaw)) {
    return { ok: false, error: 'Invalid reason', status: 400 }
  }
  const note = normalizePostReportNote((body as { note?: unknown }).note)
  return { ok: true, postId, reason: reasonRaw, note }
}

export function postReportSubmitEnabled(reason: PostReportReason | null): boolean {
  return reason != null
}
