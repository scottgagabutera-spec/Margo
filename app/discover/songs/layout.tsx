import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Songs',
  description:
    'Browse the Margo song catalog. Find a track, open Karaoke, and listen line by line — then share a lyric that says how you feel.',
  alternates: { canonical: 'https://trymargo.com/discover/songs' },
  openGraph: {
    title: 'Songs | Margo',
    description:
      'The Margo song catalog — listen, open Karaoke, and find lyrics worth sharing.',
    url: 'https://trymargo.com/discover/songs',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Songs | Margo',
    description: 'Browse songs on Margo. Listen and open Karaoke on any track.',
    images: ['/og-image.png'],
  },
}

export default function DiscoverSongsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
