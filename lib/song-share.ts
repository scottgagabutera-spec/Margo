import { MARGO_SITE_ORIGIN } from '@/lib/moment/share'

export function getSongShareUrl(songId: string): string {
  return `${MARGO_SITE_ORIGIN}/song/${songId}`
}

export async function shareSong(opts: {
  id: string
  title: string
  artist: string
}): Promise<'shared' | 'copied' | 'failed'> {
  const url = getSongShareUrl(opts.id)
  const title = `${opts.title} — ${opts.artist}`

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, url })
      return 'shared'
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'failed'
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url)
      return 'copied'
    } catch {
      return 'failed'
    }
  }

  return 'failed'
}
