import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lyric Back — Reply With a Song',
  description:
    'Someone posted a lyric. Reply with one of your own — a Lyric Back. The conversation happens through music on Margo.',
  alternates: { canonical: 'https://trymargo.com/lyric-back' },
  openGraph: {
    title: 'Send a Lyric Back on Margo',
    description: 'Someone said something with a lyric. Say something back. Lyric Back is how Margo conversations happen.',
    url: 'https://trymargo.com/lyric-back',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lyric Back — Reply With a Song',
    description: 'Someone said something with a lyric. Say something back.',
    images: ['/og-image.png'],
  },
}

export default function LyricBackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
