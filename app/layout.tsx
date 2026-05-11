import type { Metadata } from 'next'
import { Lora, Syne } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const lora = Lora({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
})

const syne = Syne({
  subsets: ['latin'],
  weight: ['800'],
  variable: '--font-syne',
})

const BASE_URL = 'https://trymargo.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Margo — Communicate Through Song Lyrics',
    template: '%s | Margo',
  },
  description:
    'Margo is where people speak through song lyrics. Post a lyric, choose your emotion, get a Lyric Back. Original music by Margo on Spotify, Apple Music, Boomplay and all platforms.',
  keywords: [
    'communicate through song lyrics',
    'lyric back',
    'share a lyric',
    'music social platform',
    'song lyrics app',
    'express emotions with lyrics',
    'margo music',
    'trymargo',
    'original music',
    'lyric sharing',
  ],
  authors: [{ name: 'Margo', url: BASE_URL }],
  creator: 'Margo',
  publisher: 'Margo',
  category: 'music',
  applicationName: 'Margo',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Margo',
    title: 'Margo — Communicate Through Song Lyrics',
    description:
      'Margo is where people speak through song lyrics. Post a lyric, choose your emotion, get a Lyric Back. Original music by Margo on Spotify, Apple Music and all platforms.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Margo — Communicate Through Song Lyrics',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@OfficialUTM',
    creator: '@OfficialUTM',
    title: 'Margo — Communicate Through Song Lyrics',
    description:
      'Post a lyric. Choose your emotion. Get a Lyric Back. Margo is the platform where music is the language.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: BASE_URL,
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${lora.variable} ${syne.variable}`}>
      <head>
        {/* Structured Data — WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Margo',
              url: 'https://trymargo.com',
              description:
                'Margo is a social platform where people communicate through song lyrics. Post a lyric tied to an emotion, reply with a Lyric Back, and share exportable lyric cards.',
              applicationCategory: 'MusicApplication',
              operatingSystem: 'Web, iOS, Android',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              creator: {
                '@type': 'Organization',
                name: 'Margo',
                url: 'https://trymargo.com',
                logo: 'https://trymargo.com/icon.svg',
                sameAs: [
                  'https://www.instagram.com/officialtrymargo',
                  'https://open.spotify.com/artist/0rGTnmN8rE5so9ibBrhTbJ',
                  'https://music.apple.com/us/artist/trymargo/1896142795',
                  'https://www.facebook.com/share/1CiYZanmmg/',
                  'https://x.com/OfficialUTM',
                  'https://youtube.com/@trymargo',
                  'https://www.boomplay.com/share/artist/130532485',
                  'https://www.tiktok.com/@officialtrymargo',
                ],
              },
            }),
          }}
        />
        {/* Structured Data — MusicGroup */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'MusicGroup',
              name: 'Trymargo',
              url: 'https://trymargo.com/music',
              image: 'https://trymargo.com/icon.svg',
              description:
                'Trymargo is an original music artist. Listen on Spotify, Apple Music, Boomplay, YouTube and all major streaming platforms.',
              sameAs: [
                'https://open.spotify.com/artist/0rGTnmN8rE5so9ibBrhTbJ',
                'https://music.apple.com/us/artist/trymargo/1896142795',
                'https://www.boomplay.com/share/artist/130532485',
                'https://youtube.com/@trymargo',
                'https://www.tiktok.com/@officialtrymargo',
                'https://www.instagram.com/officialtrymargo',
              ],
            }),
          }}
        />
      </head>
      <body
        className="antialiased bg-gradient-to-br from-[#08070C] via-[#0a0909] to-[#0f0e14] min-h-screen"
        style={{ fontFamily: 'var(--font-lora), serif', color: '#F4F1ED' }}
      >
        <div
          className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
