import type { MargoMoment } from '@/lib/moment/types'
import { momentHasPlayableSnippet } from '@/lib/moment-export/timeline/build-moment-timeline'
import { resolveMomentListen } from '@/lib/moment/listen'
import { getSongShareUrl } from '@/lib/song-share'
import {
  getMomentShareUrl,
  isMomentRecipientShareable,
  MARGO_SITE_ORIGIN,
} from '@/lib/moment/share'

export interface MomentFileShareCaption {
  title: string
  text: string
}

function primaryLyricTitle(moment: MargoMoment): string {
  const lyric = moment.lines[0]?.lyric?.trim()
  if (!lyric) return 'A Moment on Margo'
  const short = lyric.length > 48 ? `${lyric.slice(0, 47).trimEnd()}…` : lyric
  return `"${short}"`
}

/** Category-aware caption for native file shares (image / video / GIF). */
export function buildMomentFileShareCaption(moment: MargoMoment): MomentFileShareCaption {
  const primary = moment.lines[0]
  const lyric = primary?.lyric?.trim() ?? ''
  const meta = [primary?.songTitle, primary?.artistName].filter(Boolean).join(' · ')
  const body = lyric ? `"${lyric}"${meta ? ` — ${meta}` : ''}` : meta

  let ctaLine: string

  if (momentHasPlayableSnippet(moment)) {
    if (isMomentRecipientShareable(moment)) {
      ctaLine = `Hear this line on Margo\n${getMomentShareUrl(moment.postId)}`
    } else if (primary?.songId) {
      ctaLine = `Hear this line on Margo\n${getSongShareUrl(primary.songId)}`
    } else {
      ctaLine = `Made with Margo\n${MARGO_SITE_ORIGIN}`
    }
  } else {
    const listen = moment.listen ?? resolveMomentListen(moment)
    if (listen.externalUrl) {
      ctaLine = `Listen to the full song\n${listen.externalUrl}`
    } else {
      ctaLine = `Made with Margo\n${MARGO_SITE_ORIGIN}`
    }
  }

  const text = body ? `${body}\n\n${ctaLine}` : ctaLine
  return { title: primaryLyricTitle(moment), text }
}

export type ShareMomentFileResult = 'shared' | 'failed' | 'cancelled'

/** Share a Moment export file with caption text when the platform allows it. */
export async function shareMomentFile(
  file: File,
  moment: MargoMoment,
): Promise<ShareMomentFileResult> {
  if (typeof navigator === 'undefined' || !navigator.share) return 'failed'

  const { title, text } = buildMomentFileShareCaption(moment)
  const candidates: ShareData[] = [
    { files: [file], title, text },
    { files: [file], title },
    { files: [file] },
  ]

  for (const payload of candidates) {
    if (typeof navigator.canShare === 'function') {
      try {
        if (!navigator.canShare(payload)) continue
      } catch {
        /* Some Android builds reject canShare probes */
      }
    }
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'cancelled'
    }
  }
  return 'failed'
}
