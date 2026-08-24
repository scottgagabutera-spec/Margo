import type { MargoMoment } from '@/lib/moment/types'

export const MARGO_SITE_ORIGIN = 'https://trymargo.com'

export interface LyricBackShareInput {
  parentLyric: string
  replyLyric: string
}

export function getMomentShareUrl(postId?: string | null): string {
  if (postId) return `${MARGO_SITE_ORIGIN}/m/${postId}`
  return MARGO_SITE_ORIGIN
}

/** Plain-text fallback for clipboard and share sheets. */
export function buildMomentShareText(
  moment: MargoMoment,
  options?: { siteSuffix?: boolean; includeUrl?: boolean },
): string {
  const includeSuffix = options?.siteSuffix !== false
  const includeUrl = options?.includeUrl === true
  const parts = moment.lines.map((line) => {
    const meta: string[] = []
    if (line.artistName) meta.push(line.artistName)
    if (line.songTitle) meta.push(line.songTitle)
    const suffix = meta.length > 0 ? ` — ${meta.join(', ')}` : ''
    return `"${line.lyric}"${suffix}`
  })
  const body = parts.join('  ·  ')
  const url = moment.postId ? getMomentShareUrl(moment.postId) : null

  if (includeUrl && url) {
    return body ? `${body}\n${url}` : url
  }
  if (!includeSuffix) return body
  if (url) return body ? `${body}\n${url}` : url
  return body ? `${body} — trymargo.com` : 'trymargo.com'
}

export function buildLyricBackShareText(input: LyricBackShareInput): string {
  return `"${input.parentLyric}" ↩ "${input.replyLyric}" — trymargo.com`
}

export interface NativeSharePayload {
  title: string
  text: string
  url: string
}

/** Standard Web Share API payload — URL + full lyric text (separate fields). */
export function buildNativeSharePayload(moment: MargoMoment): NativeSharePayload {
  const url = getMomentShareUrl(moment.postId)
  const text = buildMomentShareText(moment, { siteSuffix: false })
  return {
    title: 'MARGO',
    text,
    url,
  }
}

export function buildLyricBackNativeSharePayload(
  input: LyricBackShareInput,
  postId?: string | null,
): NativeSharePayload {
  const url = getMomentShareUrl(postId)
  return {
    title: 'MARGO',
    text: buildLyricBackShareText(input),
    url,
  }
}

export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/**
 * Whether the current browser can share image files via navigator.share({ files }).
 * Does not guarantee the destination app will accept the image.
 */
export function canShareImageFiles(): boolean {
  if (typeof navigator === 'undefined') return false
  if (!navigator.share) return false
  if (typeof navigator.canShare !== 'function') return false
  try {
    const probe = new File([''], 'margo-moment.png', { type: 'image/png' })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

export type NativeShareResult = 'shared' | 'copied' | 'failed'

/** Invoke native share with text+url; clipboard URL fallback. */
export async function shareMomentNative(moment: MargoMoment): Promise<NativeShareResult> {
  const payload = buildNativeSharePayload(moment)

  if (canNativeShare()) {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'failed'
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      const fallback = buildMomentShareText(moment, { includeUrl: true })
      await navigator.clipboard.writeText(fallback)
      return 'copied'
    } catch {
      return 'failed'
    }
  }

  return 'failed'
}

export async function copyMomentShareText(moment: MargoMoment): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(buildMomentShareText(moment, { includeUrl: true }))
    return true
  } catch {
    return false
  }
}
