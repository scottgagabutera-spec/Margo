import { AdminTrigger } from '@/components/admin-trigger'
import { AudioEngineProvider } from '@/components/audio-engine-provider'
import { SupabaseAuthProvider } from '@/components/supabase-auth-provider'
import { IdentityProvider } from '@/hooks/useIdentity'
import { NotificationsProvider } from '@/hooks/useNotifications'
import { MessagingProvider } from '@/hooks/useMessaging'
import { MiniPlayer } from '@/components/mini-player'
import { MargoNav } from '@/components/margo-nav'
import { MobileTabBar } from '@/components/mobile-tab-bar'
import { TabSwipeProvider } from '@/hooks/useTabSwipe'
import { Toaster } from '@/components/ui/sonner'
import type { Metadata, Viewport } from 'next'
import { Lora, Syne } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
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

// viewport-fit=cover is required for env(safe-area-inset-*) to resolve to
// real values on iOS Safari. Without it, every safe-area-based padding
// in globals.css (--margo-safe-bottom and everything derived from it)
// silently evaluates to 0px on iPhone, even though it works fine on Android.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

const SITE_TITLE = 'Margo | Talk, Listen & Share Through Song Lyrics'
const SITE_DESCRIPTION =
  'Margo is where people communicate through song lyrics. Listen to lyric moments on Feed, explore songs and artists on Discover, and sing along in Karaoke — music as the language.'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s | Margo',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'communicate through song lyrics',
    'lyric social platform',
    'share a lyric',
    'music social platform',
    'song lyrics app',
    'lyric feed',
    'discover lyrics',
    'karaoke lyrics',
    'trymargo',
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
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@OfficialUTM',
    creator: '@OfficialUTM',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
    <html lang="en" className={`${lora.variable} ${syne.variable} ${GeistSans.variable}`}>
      <head>
        <link rel="dns-prefetch" href="https://audio.trymargo.com" />
        <link rel="preconnect" href="https://audio.trymargo.com" crossOrigin="anonymous" />
        {/* Structured Data — WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Margo',
              url: 'https://trymargo.com',
              description: SITE_DESCRIPTION,
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
              url: 'https://trymargo.com/discover',
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
        style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', color: '#F4F1ED' }}
      >
        <div
          className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        <SupabaseAuthProvider>
          <IdentityProvider>
            <AudioEngineProvider>
              <NotificationsProvider>
                <MessagingProvider>
                  <MargoNav />
                  <TabSwipeProvider>
                    {children}
                  </TabSwipeProvider>
                  <MobileTabBar />
                </MessagingProvider>
              </NotificationsProvider>
            </AudioEngineProvider>
          </IdentityProvider>
        </SupabaseAuthProvider>
        <Toaster
          theme="dark"
          position="bottom-center"
          offset={0}
          toastOptions={{
            style: {
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--gold-border)',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            },
            classNames: {
              error: 'margo-toast-error',
            },
          }}
        />
        <AdminTrigger />
        <MiniPlayer />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}