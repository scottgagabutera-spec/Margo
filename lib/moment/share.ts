import type { MargoMoment } from '@/lib/moment/types'
import { MARGO_SITE_ORIGIN, resolveMomentShareOrigin } from '@/lib/moment/site-origin'

export { MARGO_SITE_ORIGIN } from '@/lib/moment/site-origin'

export interface LyricBackShareInput {
  parentLyric: string
  replyLyric: string
}

export function getMomentShareUrl(postId?: string | null, origin?: string): string {
  const base = origin || resolveMomentShareOrigin()
  if (postId) return `${base}/m/${postId}`
  return base
}

/** Whether a persisted Moment can be shared via /m/{id} to recipients. */
export function isMomentRecipientShareable(moment: MargoMoment): boolean {
  if (!moment.postId) return false
  return moment.status === 'active'
}

/** Human-readable share body — lyric + meta, no URL. */
export function buildMomentShareText(
  moment: MargoMoment,
  options?: { siteSuffix?: boolean; includeUrl?: boolean },
): string {
  const includeSuffix = options?.siteSuffix !== false
  const includeUrl = options?.includeUrl === true
  const parts = moment.lines.map((line) => {
    const meta: string[] = []
    if (line.songTitle) meta.push(line.songTitle)
    if (line.artistName) meta.push(line.artistName)
    const suffix = meta.length > 0 ? ` — ${meta.join(' · ')}` : ''
    return `"${line.lyric}"${suffix}`
  })
  const body = parts.join('\n')
  const url = moment.postId ? getMomentShareUrl(moment.postId) : null

  if (includeUrl && url) {
    return body ? `${body}\n\n${buildMomentLinkCta(moment)}\n${url}` : url
  }
  if (!includeSuffix) return body
  if (url) return body ? `${body}\n\n${buildMomentLinkCta(moment)}` : buildMomentLinkCta(moment)
  return body ? `${body} — trymargo.com` : 'trymargo.com'
}

/** Short CTA label recipients see instead of a raw UUID path. */
export function buildMomentLinkCta(moment: MargoMoment): string {
  const primary = moment.lines[0]
  const snippet = primary?.lyric?.trim()
  if (snippet) {
    const short = snippet.length > 42 ? `${snippet.slice(0, 41).trimEnd()}…` : snippet
    return `↳ Open “${short}” on Margo`
  }
  return '↳ Open this Moment on Margo'
}

export function buildLyricBackShareText(input: LyricBackShareInput): string {
  return `"${input.parentLyric}" ↩ "${input.replyLyric}" — trymargo.com`
}

export interface NativeSharePayload {
  title: string
  text: string
  url: string
}

/** Standard Web Share API payload — lyric in text, URL separate for OG preview. */
export function buildNativeSharePayload(moment: MargoMoment): NativeSharePayload {
  const url = getMomentShareUrl(moment.postId)
  const text = buildMomentShareText(moment, { siteSuffix: false })
  const primary = moment.lines[0]
  const title = primary?.lyric
    ? `"${primary.lyric.length > 48 ? `${primary.lyric.slice(0, 47).trimEnd()}…` : primary.lyric}"`
    : 'A Moment on Margo'
  return {
    title,
    text: text ? `${text}\n\n${buildMomentLinkCta(moment)}` : buildMomentLinkCta(moment),
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
  if (!isMomentRecipientShareable(moment)) return 'failed'

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
  return copyMomentShareLink(moment)
}

/** Copy lyric + branded CTA; URL on its own line for paste apps that need it. */
export async function copyMomentShareLink(moment: MargoMoment): Promise<boolean> {
  if (!isMomentRecipientShareable(moment)) return false
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(buildMomentShareText(moment, { includeUrl: true }))
    return true
  } catch {
    return false
  }
}
