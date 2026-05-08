import type { Metadata } from 'next'
import { Lora, Syne } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const lora = Lora({
  subsets: ["latin"],
  style: ['normal', 'italic'],
  variable: '--font-lora'
});

const syne = Syne({
  subsets: ["latin"],
  weight: ['800'],
  variable: '--font-syne'
});

export const metadata: Metadata = {
  title: 'Margo',
  description: 'Say it with a song. Margo is where people communicate through music lyrics.',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${lora.variable} ${syne.variable}`}>
      <body className="antialiased bg-gradient-to-br from-[#08070C] via-[#0a0909] to-[#0f0e14] min-h-screen" style={{fontFamily:"var(--font-lora), serif", color:"#F4F1ED"}}>
        <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
