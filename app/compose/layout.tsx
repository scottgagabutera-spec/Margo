import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Send a line — Say It With a Song',
  description:
    'Find a line that says what you feel. Hear it, then send it to someone.',
  alternates: { canonical: 'https://trymargo.com/compose' },
  openGraph: {
    title: 'Send a line on Margo',
    description: 'Find a line that says what you feel. Hear it, then send it to someone.',
    url: 'https://trymargo.com/compose',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Send a line on Margo',
    description: 'Find a line. Hear it. Send it to someone.',
    images: ['/og-image.png'],
  },
}

export default function ComposeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
