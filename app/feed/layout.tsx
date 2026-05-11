import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Feed — What People Are Saying Right Now',
  description:
    'See what lyrics people are posting right now on Margo. Every lyric is a message. Filter by emotion — Love, Heartbreak, Hope, Rage, Joy and more.',
  alternates: { canonical: 'https://trymargo.com/feed' },
  openGraph: {
    title: 'Margo Feed — Lyrics as Emotion',
    description: 'Every lyric is a message. See what people are feeling right now through song lyrics on Margo.',
    url: 'https://trymargo.com/feed',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Margo Feed — Lyrics as Emotion',
    description: 'Every lyric is a message. See what people are feeling right now.',
    images: ['/og-image.png'],
  },
}

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
