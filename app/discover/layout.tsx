import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { DiscoverErrorBoundary } from '@/components/discover-error-boundary'

export const metadata: Metadata = {
  title: 'Discover',
  description:
    'Explore lyric moments, mixtapes, songs, and artists on Margo. Listen to lines that match how you feel, then open Karaoke on any track.',
  alternates: { canonical: 'https://trymargo.com/discover' },
  openGraph: {
    title: 'Discover | Margo',
    description:
      'Lyric moments, mixtapes, songs, and artists — explore what people are listening to and saying through lyrics.',
    url: 'https://trymargo.com/discover',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover | Margo',
    description: 'Explore lyric moments, songs, and artists on Margo.',
    images: ['/og-image.png'],
  },
}

export default function DiscoverLayout({ children }: { children: ReactNode }) {
  return <DiscoverErrorBoundary>{children}</DiscoverErrorBoundary>
}
