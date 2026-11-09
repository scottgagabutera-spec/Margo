import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
})

export default function HelpLayout({ children }: { children: ReactNode }) {
  return <div className={`margo-help-root ${inter.className}`}>{children}</div>
}
