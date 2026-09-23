/** Parse YouTube Data API / upload error JSON into a readable line. */
export function formatYouTubeApiError(
  status: number,
  bodyText: string,
  phase: 'resumable init' | 'video upload',
): string {
  const trimmed = (bodyText || '').trim()
  try {
    const json = JSON.parse(trimmed) as {
      error?: {
        code?: number
        message?: string
        status?: string
        errors?: Array<{ reason?: string; message?: string; domain?: string }>
      }
    }
    const err = json.error
    if (err) {
      const reason = err.errors?.[0]?.reason
      const detail = err.message || err.errors?.[0]?.message || trimmed
      const bits = [
        `YouTube ${phase} failed `,
        `(HTTP ${err.code ?? status}`,
        err.status ? ` ${err.status}` : '',
        reason ? `, ${reason}` : '',
        ')',
        `: ${detail}`,
      ]
      return bits.join('')
    }
  } catch {
    /* use raw body below */
  }
  if (!trimmed) {
    return `YouTube ${phase} failed (HTTP ${status}) with an empty response body`
  }
  return `YouTube ${phase} failed (HTTP ${status}): ${trimmed.slice(0, 800)}`
}

/** Parse Facebook Graph API error JSON into a readable line. */
export function formatFacebookApiError(status: number, bodyText: string, phase: string): string {
  const trimmed = (bodyText || '').trim()
  try {
    const json = JSON.parse(trimmed) as {
      error?: { code?: number; message?: string; type?: string; error_subcode?: number }
    }
    const err = json.error
    if (err) {
      const bits = [
        `Facebook ${phase} failed `,
        `(HTTP ${err.code ?? status}`,
        err.type ? ` ${err.type}` : '',
        err.error_subcode ? `, subcode ${err.error_subcode}` : '',
        ')',
        `: ${err.message || trimmed}`,
      ]
      return bits.join('')
    }
  } catch {
    /* use raw body below */
  }
  if (!trimmed) {
    return `Facebook ${phase} failed (HTTP ${status}) with an empty response body`
  }
  return `Facebook ${phase} failed (HTTP ${status}): ${trimmed.slice(0, 800)}`
}

function parsedErrorMessage(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null
  const rec = parsed as { error?: unknown; message?: unknown }
  if (typeof rec.error === 'string' && rec.error.trim()) return rec.error.trim()
  if (rec.error && typeof rec.error === 'object') {
    const nested = rec.error as { message?: unknown }
    if (typeof nested.message === 'string' && nested.message.trim()) return nested.message.trim()
  }
  if (typeof rec.message === 'string' && rec.message.trim()) return rec.message.trim()
  return null
}

/**
 * Turn a failed /api/promote publish Response into the actual reason.
 * Empty/HTML bodies (typical of Vercel 413/504) used to collapse to "Publish failed".
 */
export function formatPromoteHttpError(
  status: number,
  statusText: string,
  rawBody: string,
  parsed: unknown,
): string {
  const fromJson = parsedErrorMessage(parsed)
  if (fromJson) return fromJson

  const label = statusText ? `HTTP ${status} ${statusText}` : `HTTP ${status}`
  const trimmed = (rawBody || '').trim()

  if (status === 413) {
    return (
      `${label}: the rendered MP4 was rejected before our publish handler ran ` +
      '(Vercel serverless request body limit is ~4.5 MB). This is an upload-size limit, ' +
      'not a YouTube auth or video-format error.'
    )
  }

  if (status === 504 || status === 524 || status === 408) {
    return (
      `${label}: the publish request timed out before YouTube returned a result. ` +
      (trimmed ? trimmed.slice(0, 400) : 'No response body.')
    )
  }

  if (!trimmed) {
    return (
      `Publish failed (${label}) with an empty response — the request never reached ` +
      'YouTube (proxy/size/timeout), so there is no YouTube API error to show.'
    )
  }

  const snippet = trimmed.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
  return `Publish failed (${label}): ${snippet}`
}

export async function readPromoteResponse(
  res: Response,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; error: string }> {
  const raw = await res.text()
  let parsed: unknown = null
  if (raw.trim()) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = null
    }
  }
  if (res.ok) {
    return {
      ok: true,
      body: parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {},
    }
  }
  return {
    ok: false,
    error: formatPromoteHttpError(res.status, res.statusText, raw, parsed),
  }
}
