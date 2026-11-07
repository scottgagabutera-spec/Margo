import { MARGO_SITE_ORIGIN } from '@/lib/moment/site-origin'

export function getProfileShareUrl(username: string): string {
  return `${MARGO_SITE_ORIGIN}/profile/${encodeURIComponent(username)}`
}

export async function shareProfile(opts: {
  username: string
  displayName: string
}): Promise<'shared' | 'copied' | 'failed'> {
  const url = getProfileShareUrl(opts.username)
  const title = `${opts.displayName} on Margo`

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
