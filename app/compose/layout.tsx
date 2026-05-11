import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Share a Lyric — Say It With a Song',
  description:
    'Find a lyric that says what you feel. Search any song, pick your emotion, and share it on Margo. Say it with a song.',
  alternates: { canonical: 'https://trymargo.com/compose' },
  openGraph: {
    title: 'Share a Lyric on Margo',
    description: 'Find a lyric that says what you feel. Search any song, pick your emotion, and post it on Margo.',
    url: 'https://trymargo.com/compose',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Share a Lyric on Margo',
    description: 'Say it with a song. Find a lyric, pick your emotion, post it.',
    images: ['/og-image.png'],
  },
}

export default function ComposeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
