import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Resonance',
  description:
    'What people are saying with songs on Margo — posts tied to catalog lyrics, not the whole Feed.',
  alternates: { canonical: 'https://trymargo.com/discover/resonance' },
  openGraph: {
    title: 'Resonance | Margo',
    description: 'Posts that use songs — listen to the quoted line, then Lyric Back.',
    url: 'https://trymargo.com/discover/resonance',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Resonance | Margo',
    description: 'What people are saying, using songs.',
    images: ['/og-image.png'],
  },
}

export default function DiscoverResonanceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
