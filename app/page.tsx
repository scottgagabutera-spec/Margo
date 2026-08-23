import type { Metadata } from 'next'
import { StageLandingPage } from '@/components/stage/stage-landing-page'

const TITLE = 'Margo — Send a song line that says it for you'
const DESCRIPTION =
  'Find a song, pick the line that says what you feel, and send it to someone. Margo turns the lyric you are feeling into something you can share.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://trymargo.com/' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://trymargo.com/',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
}

export default function Home() {
  return <StageLandingPage />
}
