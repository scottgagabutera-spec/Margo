import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Lyric Moments',
  description:
    'Browse lyric moments on Margo — lines picked for how they feel, not just what is playing.',
  alternates: { canonical: 'https://trymargo.com/discover/moments' },
  openGraph: {
    title: 'Lyric Moments | Margo',
    description: 'Every tagged lyric moment — listen, queue, and open the line that fits.',
    url: 'https://trymargo.com/discover/moments',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lyric Moments | Margo',
    description: 'Browse lyric moments on Margo.',
    images: ['/og-image.png'],
  },
}

export default function DiscoverMomentsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
