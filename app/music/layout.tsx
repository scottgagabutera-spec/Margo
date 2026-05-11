import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Music — Trymargo Original Songs',
  description:
    'Listen to original music by Trymargo. Stream on Spotify, Apple Music, Boomplay, YouTube and all major platforms. Full karaoke lyrics synced in real time.',
  alternates: { canonical: 'https://trymargo.com/music' },
  openGraph: {
    title: 'Trymargo Music — Stream on All Platforms',
    description:
      'Original songs by Trymargo. Full karaoke experience with synced lyrics. Available on Spotify, Apple Music, Boomplay and everywhere music lives.',
    url: 'https://trymargo.com/music',
    type: 'music.musician',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trymargo Music',
    description: 'Original songs. Full karaoke. Stream on Spotify, Apple Music, Boomplay and all platforms.',
    images: ['/og-image.png'],
  },
}

export default function MusicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
