import { resolveMomentListen } from '@/lib/moment/listen'
import { isMomentRecipientShareable } from '@/lib/moment/share'
import { MARGO_SITE_ORIGIN } from '@/lib/moment/site-origin'
import type { MargoMoment } from '@/lib/moment/types'

export interface MomentExportListenTarget {
  url: string
  label: string
  hint: string
}

function siteOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : MARGO_SITE_ORIGIN
}

/**
 * Resolve a tappable listen destination for PNG/PDF export.
 * Margo snippets link to a playable page; external songs open Apple Music (or next best URL).
 */
export function resolveMomentExportListen(moment: MargoMoment): MomentExportListenTarget | null {
  const listen = moment.listen ?? resolveMomentListen(moment)
  const origin = siteOrigin()

  if (listen.canPlayInline) {
    if (moment.postId && isMomentRecipientShareable(moment)) {
      return {
        url: `${origin}/m/${moment.postId}?play=1`,
        label: 'Listen on Margo',
        hint: 'Tap to play',
      }
    }
    if (listen.songId) {
      return {
        url: `${origin}/song/${listen.songId}?play=1`,
        label: 'Listen on Margo',
        hint: 'Opens in browser',
      }
    }
  }

  const external = listen.externalUrl?.trim()
  if (external) {
    const isApple = external.includes('music.apple.com') || external.includes('itunes.apple.com')
    return {
      url: external,
      label: isApple ? 'Listen on Apple Music' : 'Listen',
      hint: 'Opens in browser',
    }
  }

  return null
}
