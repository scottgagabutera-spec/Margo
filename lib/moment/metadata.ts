import type { Metadata } from 'next'
import type { MargoMoment } from '@/lib/moment/types'
import { MARGO_SITE_ORIGIN } from '@/lib/moment/site-origin'

export function getMomentPageUrl(postId: string): string {
  return `${MARGO_SITE_ORIGIN}/m/${postId}`
}

export function getMomentOgImageUrl(postId: string): string {
  return `${MARGO_SITE_ORIGIN}/api/moment/${postId}/og`
}

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1).trimEnd() + '…'
}

export function buildMomentOgTitle(moment: MargoMoment): string {
  const primary = moment.lines[0]
  if (!primary?.lyric) return 'A lyric moment on Margo'
  const lyric = truncate(primary.lyric.replace(/\s+/g, ' '), 72)
  const meta: string[] = []
  if (primary.songTitle) meta.push(primary.songTitle)
  if (primary.artistName) meta.push(primary.artistName)
  if (meta.length > 0) return `"${lyric}" — ${meta.join(' · ')}`
  return `"${lyric}"`
}

export function buildMomentOgDescription(
  moment: MargoMoment,
  senderLabel?: string | null,
): string {
  const parts: string[] = []
  if (senderLabel) parts.push(`Sent by ${senderLabel}`)
  if (moment.vibeLabel) parts.push(moment.vibeLabel)
  parts.push('Listen on Margo')
  return truncate(parts.join(' · '), 160)
}

export function buildMomentPageMetadata(
  moment: MargoMoment,
  postId: string,
  options?: { senderLabel?: string | null },
): Metadata {
  const title = buildMomentOgTitle(moment)
  const description = buildMomentOgDescription(moment, options?.senderLabel)
  const url = getMomentPageUrl(postId)
  const ogImage = getMomentOgImageUrl(postId)

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: 'Margo',
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}
